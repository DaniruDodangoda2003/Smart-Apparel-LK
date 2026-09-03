import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { loadLocal, saveLocal, STORAGE_KEYS } from '../../shared/storage/localStore';
import {
  ArrowLeft, CheckCircle, Activity, Bell, Settings, FileText,
  History, TrendingDown, AlertCircle, ChevronDown, ChevronRight,
  Info, ArrowLeftCircle, HelpCircle, Plus, Table, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  Area, AreaChart, ReferenceLine
} from 'recharts';

// Deterministic priority logic
// IF data_sufficiency === LIMITED AND risk_14d >= 0.50 → MANUAL_REVIEW
// IF priority === LOW (and GOOD) → MONITOR
// else use fixture priority
function resolveDecisionState(priority, dataSufficiency, risk14d) {
  if (dataSufficiency === 'LIMITED' && (risk14d || 0) >= 0.50) return 'MANUAL_REVIEW';
  if (dataSufficiency === 'LIMITED') return 'MANUAL_REVIEW'; // always for limited
  return priority; // CRITICAL, HIGH, WARNING, MANUAL_REVIEW, MEDIUM, LOW
}

function getRiskColor(val) {
  if (val >= 0.7) return '#dc2626';
  if (val >= 0.5) return '#ea580c';
  if (val >= 0.3) return '#d97706';
  return '#16a34a';
}

function formatRiskValue(val) {
  if (typeof val === 'number') return `${(val * 100).toFixed(0)}%`;
  return val ?? 'N/A';
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ProgressBar = ({ value, label }) => {
  const pct = typeof value === 'number' ? Math.round(value * 100) : 0;
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="font-semibold text-gray-900">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        <div className={`${barColor} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default function C3MachineAnalysis() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions, setSavedActions } = useAppContext();

  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [prediction, setPrediction]       = useState(null);
  const [machineInfo, setMachineInfo]     = useState(null);
  const [isLimitedScenario, setIsLimitedScenario] = useState(false);
  const [historyData, setHistoryData]     = useState(null);
  const [sufficiencyData, setSufficiencyData] = useState(null);
  const [survivalData, setSurvivalData]   = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [protoInfoOpen, setProtoInfoOpen] = useState(false);

  const [c3State, setC3State] = useState(() => loadLocal(STORAGE_KEYS.C3_STATE, { acknowledgements: {} }));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [preds, histList, suffList, survList, expList, limitedList, machines] = await loadMultipleDemoJson([
          'c3/predictions.json',
          'c3/maintenance_history.json',
          'c3/data_sufficiency_details.json',
          'c3/survival_outputs.json',
          'c3/explanations.json',
          'c3/limited_scenarios.json',
          'shared/machines.json'
        ]);

        const machineRecord = machines.find(m => m.machine_id === machineId);
        setMachineInfo(machineRecord || null);

        let predRecord = preds.find(p => p.machine_id === machineId);
        let limited = false;

        if (!predRecord) {
          const limitedRecord = limitedList.find(s => s.machine_id === machineId);
          if (limitedRecord) {
            predRecord = limitedRecord;
            limited = true;
          } else if (machineRecord) {
            predRecord = {
              machine_id: machineRecord.machine_id,
              display_code: machineRecord.display_code,
              factory_id: machineRecord.factory_id,
              line_id: machineRecord.line_id,
              risk_7d: 0.60,
              risk_14d: 0.72,
              risk_30d: 0.81,
              data_sufficiency: 'LIMITED',
              priority: 'WARNING',
              output_mode: 'DEMO_PRECOMPUTED',
              data_classification: 'SYNTHETIC_DEMONSTRATION',
              decision_recommendation: 'Manual Review Recommended',
              scored_at: null
            };
            limited = true;
          } else {
            throw new Error('Machine record not found in current demo fixtures.');
          }
        }

        // Also check limited list even if in predictions (for SN-088)
        if (!limited && limitedList.find(s => s.machine_id === machineId)) {
          limited = predRecord.data_sufficiency === 'LIMITED';
        }

        setPrediction(predRecord);
        setIsLimitedScenario(predRecord.data_sufficiency === 'LIMITED');

        setHistoryData(histList.find(h => h.machine_id === machineId));
        setSufficiencyData(suffList.find(s => s.machine_id === machineId));
        setSurvivalData(survList.find(s => s.machine_id === machineId));
        setExplanationData(expList.find(e => e.machine_id === machineId));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [machineId]);

  if (loading) return <LoadingState message="Loading machine analysis..." />;
  if (error) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <ErrorState title="Failed to load machine analysis" message={error} />
      <button onClick={() => navigate('/c3')} className="text-blue-600 hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Fleet Overview
      </button>
    </div>
  );

  const matchedAlert = globalAlerts.find(a => a.component_id === 'C3' && a.entity_id === prediction.machine_id);
  const findingAck   = c3State.acknowledgements?.[prediction.machine_id];
  const decisionState = resolveDecisionState(prediction.priority, prediction.data_sufficiency, prediction.risk_14d);
  const isMonitor    = decisionState === 'MONITOR' || decisionState === 'MEDIUM' || decisionState === 'LOW';
  const isManualReview = decisionState === 'MANUAL_REVIEW';
  const isCritical   = decisionState === 'CRITICAL';
  const suffStatus   = sufficiencyData?.data_sufficiency_status || prediction.data_sufficiency;

  const handleAcknowledgeFinding = () => {
    const now = new Date().toISOString();
    const updatedAck = {
      ...c3State.acknowledgements,
      [prediction.machine_id]: { machine_id: prediction.machine_id, acknowledged: true, acknowledged_at: now }
    };
    const newState = { ...c3State, acknowledgements: updatedAck };
    setC3State(newState);
    saveLocal(STORAGE_KEYS.C3_STATE, newState);
    if (matchedAlert && matchedAlert.status === 'OPEN') {
      updateAlert(matchedAlert.alert_id, 'ACKNOWLEDGED');
    }
  };

  // Navigate to the full maintenance action form
  const handleCreateAction = () => {
    navigate(`/c3/machine/${prediction.machine_id}/action/new`);
  };

  const riskChartData = [
    { horizon: '7-Day',  risk: Math.round((prediction.risk_7d  || 0) * 100), raw: prediction.risk_7d  || 0 },
    { horizon: '14-Day', risk: Math.round((prediction.risk_14d || 0) * 100), raw: prediction.risk_14d || 0 },
    { horizon: '30-Day', risk: Math.round((prediction.risk_30d || 0) * 100), raw: prediction.risk_30d || 0 }
  ];

  const survivalChartData = survivalData ? survivalData.points.map(pt => ({
    horizon: `${pt.horizon_days}d`,
    probability: Math.round(pt.failure_free_probability * 100),
    raw: pt.failure_free_probability
  })) : null;

  const shapChartData = explanationData ? explanationData.drivers
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .map(d => {
      const rawVal = +(d.shap_value.toFixed(3));
      const signedVal = d.direction === 'DECREASES_RISK' ? -Math.abs(rawVal) : Math.abs(rawVal);
      return {
        feature: d.feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: signedVal,
        abs_value: Math.abs(rawVal),
        direction: d.direction,
        display_text: d.display_text,
        feature_value: d.feature_value,
        raw_feature: d.feature
      };
    }) : null;

  const decisionStateStyle = {
    CRITICAL: 'text-red-600',
    HIGH: 'text-orange-600',
    WARNING: 'text-yellow-600',
    MANUAL_REVIEW: 'text-amber-700',
    MEDIUM: 'text-blue-600',
    LOW: 'text-sky-600',
    MONITOR: 'text-blue-600'
  }[decisionState] || 'text-gray-700';

  // Recommended action text based on decision state
  const getRecommendedAction = () => {
    if (isCritical) return 'Schedule an Inspection immediately.';
    if (decisionState === 'HIGH') return 'Schedule an Inspection or Preventive Maintenance.';
    if (decisionState === 'WARNING') return 'Inspection Recommended — schedule within the next 14 days.';
    if (isManualReview) return 'Perform Manual Review before scheduling maintenance.';
    return 'Continue Monitoring — no immediate action required.';
  };

  // Priority rationale
  const getPriorityRationale = () => {
    if (isManualReview) {
      return `Data sufficiency is LIMITED (${sufficiencyData?.history_days ?? '—'} days of history). The model risk score is elevated (14D = ${Math.round((prediction.risk_14d||0)*100)}%) but cannot be fully relied upon due to limited maintenance evidence. A risk score alone does not auto-escalate to a higher priority when evidence is LIMITED.`;
    }
    if (isCritical) {
      return `Data sufficiency is GOOD (${sufficiencyData?.history_days ?? '—'} days of history). 14-day risk score is ${Math.round((prediction.risk_14d||0)*100)}% — critical threshold. Multiple risk drivers are contributing. Proactive maintenance is recommended.`;
    }
    if (isMonitor) {
      return `Data sufficiency is GOOD. 14-day risk score is ${Math.round((prediction.risk_14d||0)*100)}% — within a low-risk range. Continue monitoring on the standard schedule.`;
    }
    return `14-day risk score is ${Math.round((prediction.risk_14d||0)*100)}%. Data sufficiency is ${suffStatus}. Review the risk drivers below to inform maintenance scheduling.`;
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* 1. Machine Identity / Context */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/c3')} className="text-gray-500 hover:text-gray-900 mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <PageHeader
              title={`${prediction.display_code} — Machine Analysis`}
              description={`${machineInfo?.machine_type || '—'} · ${prediction.factory_id} · ${prediction.line_id}`}
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
              <span>Machine ID: <span className="font-medium text-gray-700">{prediction.machine_id}</span></span>
              <span>
                Status:{' '}
                <span className={`font-semibold ${
                  machineInfo?.status === 'ACTIVE' ? 'text-green-600' :
                  machineInfo?.status === 'MAINTENANCE' ? 'text-amber-600' : 'text-gray-500'
                }`}>{machineInfo?.status || '—'}</span>
                <span className="text-gray-400 font-normal ml-1">(operational)</span>
              </span>
              <span>
                Decision Support Priority:{' '}
                <span className={`font-bold ${decisionStateStyle}`}>{decisionState}</span>
              </span>
              {prediction.model_version && (
                <span className="text-gray-400">Model: <span className="text-gray-600">{prediction.model_version}</span></span>
              )}
              {prediction.scored_at && (
                <span className="text-gray-400">Scored: <span className="text-gray-600">{formatDateTime(prediction.scored_at)}</span></span>
              )}
            </div>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-200 font-medium shrink-0">
          <Info className="w-3.5 h-3.5" />
          DEMO_PRECOMPUTED · Synthetic demonstration output
        </span>
      </div>

      {/* 2. LIMITED data notice — prominent, matches required wording */}
      {isManualReview && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-sm">Interpret prediction cautiously — manual review may be required.</p>
            <p className="text-xs text-amber-700 mt-1">
              Only limited maintenance history is available for this machine. The elevated risk score does not automatically escalate priority. A manual inspection is required before scheduling proactive maintenance.
            </p>
          </div>
        </div>
      )}

      {/* 3. Predicted Maintenance Risk */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="border-b pb-2 flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2 text-gray-900">
            <Activity className="w-5 h-5 text-gray-500" /> Predicted Maintenance Risk
          </h3>
          <span className="text-[11px] text-gray-400 italic">Precomputed risk scores (synthetic demonstration output)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: '7-Day Risk',  value: prediction.risk_7d  },
            { label: '14-Day Risk', value: prediction.risk_14d },
            { label: '30-Day Risk', value: prediction.risk_30d }
          ].map(item => (
            <div key={item.label} className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
              <p className="text-gray-500 text-xs font-medium mb-1">{item.label}</p>
              <p className="text-3xl font-bold" style={{ color: getRiskColor(item.value) }}>
                {formatRiskValue(item.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Risk bar chart */}
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={riskChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="horizon" fontSize={12} tick={{ fill: '#374151' }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={12} tick={{ fill: '#6b7280' }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Risk (%)']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="risk" radius={[4, 4, 0, 0]} barSize={40}>
                {riskChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getRiskColor(entry.raw)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-gray-400 italic">
          Risk scores are precomputed model outputs normalized to a 100-point scale. Higher scores indicate elevated maintenance risk over the stated horizon.
        </p>
      </div>

      {/* 4. Maintenance History Summary */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-base flex items-center gap-2 text-gray-900">
            <History className="w-5 h-5 text-gray-500" /> Maintenance History Summary
          </h3>
          <span className="text-[11px] text-gray-400 italic">Synthetic demonstration history</span>
        </div>

        {historyData ? (
          <div className="space-y-5">
            {/* Summary grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { label: 'History Coverage',       value: `${historyData.history_days} days`                 },
                { label: 'Time Since Last Failure', value: `${historyData.time_since_last_failure_days} days`, highlight: true },
                { label: 'Time Since Last PM',      value: `${historyData.time_since_last_pm_days} days`     },
                { label: 'Failures (30d / 90d)',    value: `${historyData.failures_30d} / ${historyData.failures_90d}`, highlight: historyData.failures_30d >= 2 },
                { label: 'Recent Downtime (30d)',   value: `${historyData.downtime_30d_hours} hrs`           },
                { label: 'MTBF',                    value: `${historyData.mtbf_days} days`                   },
                { label: 'MTTR',                    value: `${historyData.mttr_hours} hrs`                   },
                { label: 'Repeat Faults (90d)',     value: historyData.repeat_fault_count_90d, highlightOrange: historyData.repeat_fault_count_90d >= 2 }
              ].map(item => (
                <div key={item.label} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-gray-500 text-xs">{item.label}</p>
                  <p className={`font-bold text-base ${item.highlight ? 'text-red-600' : item.highlightOrange ? 'text-orange-600' : 'text-gray-900'}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Recent Maintenance Events table */}
            {historyData.recent_events && historyData.recent_events.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" /> Recent Maintenance Events
                </h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 border-b">
                        <th className="px-3 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 font-semibold">Event Type</th>
                        <th className="px-3 py-2 font-semibold">Fault / Notes</th>
                        <th className="px-3 py-2 font-semibold text-right">Repair (hrs)</th>
                        <th className="px-3 py-2 font-semibold text-right">Downtime (hrs)</th>
                        <th className="px-3 py-2 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.recent_events.map((ev, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50/50">
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{ev.date}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              ev.event_type === 'Breakdown' ? 'bg-red-50 text-red-700' :
                              ev.event_type === 'Preventive Maintenance' ? 'bg-emerald-50 text-emerald-700' :
                              'bg-blue-50 text-blue-700'
                            }`}>
                              {ev.event_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{ev.fault}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{ev.repair_duration_hours}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{ev.downtime_hours}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              ev.status === 'Resolved' || ev.status === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {ev.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : isManualReview && sufficiencyData?.history_days ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Limited maintenance history ({sufficiencyData.history_days} days of records). Some fields are unavailable.</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-gray-500 text-xs">History Coverage</p>
                <p className="font-bold text-base text-gray-900">{sufficiencyData.history_days} days</p>
              </div>
              {['Time Since Last Failure', 'Time Since Last PM', 'Failures (30d / 90d)', 'Recent Downtime (30d)', 'MTBF', 'MTTR', 'Repeat Faults (90d)'].map(label => (
                <div key={label} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-gray-500 text-xs">{label}</p>
                  <p className="text-xs text-gray-400 italic mt-1">Not available in current prototype data</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded text-center text-sm text-gray-500">
            <p>Detailed maintenance-history summary is not available for this machine in the current prototype data.</p>
          </div>
        )}
      </div>

      {/* 5. Failure-Free Probability (Survival) */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-base border-b pb-2 flex items-center gap-2 text-gray-900">
          <TrendingDown className="w-5 h-5 text-gray-500" /> Failure-Free Probability Over Time
        </h3>

        {survivalChartData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {survivalData.points.map(pt => (
                <div key={pt.horizon_days} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500">{pt.horizon_days}-Day Horizon</span>
                  <div className="my-2">
                    <span className="text-2xl font-bold text-slate-900">{(pt.failure_free_probability * 100).toFixed(0)}%</span>
                    <span className="text-xs text-slate-500 ml-1">failure-free</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pt.failure_free_probability * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={survivalChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="horizon" fontSize={12} tick={{ fill: '#374151' }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={12} tick={{ fill: '#6b7280' }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Failure-Free Probability']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <defs>
                    <linearGradient id="survivalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="probability" stroke="#3b82f6" strokeWidth={2} fill="url(#survivalGradient)" dot={{ r: 5, fill: '#3b82f6' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-gray-400 italic">
              Precomputed synthetic demonstration output from a survival / time-to-event model. These failure-free probability values are not derived from the risk horizon scores above and should not be interpreted as a guaranteed failure prediction.
              <br />
              Supporting survival estimate from a separate time-to-event model; this value is not the direct complement of the fixed-horizon classification risk.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded text-center text-gray-400 italic text-sm">
            No precomputed survival data available for this machine in the current prototype data.
          </div>
        )}
      </div>

      {/* 6. Data Sufficiency */}
      <div className={`p-5 rounded-xl border shadow-sm space-y-4 ${
        suffStatus === 'GOOD' ? 'bg-white border-gray-200' : 'bg-amber-50/30 border-amber-300'
      }`}>
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-base flex items-center gap-2 text-gray-900">
            <FileText className="w-5 h-5 text-gray-500" /> Data Sufficiency
          </h3>
          <span className={`px-3 py-1 rounded-md text-sm font-bold ${
            suffStatus === 'GOOD'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {suffStatus}
          </span>
        </div>

        {sufficiencyData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">History Coverage</span>
                  <span className="font-bold text-gray-900">{sufficiencyData.history_days} days</span>
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">PM History Availability</span>
                  {sufficiencyData.pm_history_available ? (
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">Available <CheckCircle className="w-3.5 h-3.5" /></span>
                  ) : (
                    <span className="font-semibold text-amber-700 flex items-center gap-1">Limited / Unavailable <AlertCircle className="w-3.5 h-3.5" /></span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: sufficiencyData.fault_field_availability,     label: 'Fault-Field Availability'     },
                { value: sufficiencyData.repair_duration_availability, label: 'Repair-Duration Availability' },
                { value: sufficiencyData.downtime_availability,        label: 'Downtime Availability'        }
              ].map(item => (
                <div key={item.label} className="p-3 bg-white rounded-lg border border-gray-100">
                  <ProgressBar value={item.value} label={item.label} />
                </div>
              ))}
            </div>
            <div className={`p-3 rounded-lg border text-xs ${
              suffStatus === 'GOOD'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <p className="font-semibold">
                {suffStatus === 'GOOD'
                  ? 'Available maintenance history provides stronger supporting evidence for this prediction.'
                  : 'Interpret prediction cautiously — manual review may be required. Only limited maintenance history is available before scheduling proactive maintenance.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>No detailed data sufficiency record available. Status from prediction: <span className="font-bold">{prediction.data_sufficiency}</span></span>
            </div>
            {prediction.data_sufficiency === 'LIMITED' && (
              <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Interpret prediction cautiously — manual review may be required.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 7. EXPLANATION & PRIORITY section — workflow stage heading */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5">
        {/* Workflow stage heading */}
        <div className="border-b pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wide">
              Workflow: Explain → Prioritize
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Explanation & Priority</h2>
        </div>

        {/* Why was this machine flagged? */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-base text-gray-900">
              {isMonitor ? 'What influenced this risk score?' : 'Why was this machine flagged?'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Model-Attributed Risk Drivers</p>
          </div>

          {shapChartData ? (
            <div className="space-y-4">
              <div style={{ width: '100%', height: Math.max(shapChartData.length * 52, 120) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shapChartData} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" fontSize={12} tick={{ fill: '#6b7280' }} tickFormatter={v => v > 0 ? `+${v}` : `${v}`} />
                    <YAxis type="category" dataKey="feature" width={160} fontSize={11} tick={{ fill: '#374151' }} />
                    <ReferenceLine x={0} stroke="#9ca3af" />
                    <Tooltip
                      formatter={(value) => [value > 0 ? `+${value}` : `${value}`, 'Risk Contribution (model-attributed)']}
                      labelFormatter={(label) => label}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="value" barSize={18}>
                      {shapChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.direction === 'INCREASES_RISK' ? '#dc2626' : '#16a34a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Driver detail cards */}
              <div className="space-y-2">
                {shapChartData.map(drv => (
                  <div key={drv.raw_feature} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{drv.display_text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Feature: <span className="font-mono">{drv.raw_feature}</span> = {drv.feature_value}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold ${drv.direction === 'INCREASES_RISK' ? 'text-red-600' : 'text-green-600'}`}>
                        {drv.direction === 'INCREASES_RISK' ? '+' : '−'}{drv.abs_value}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        drv.direction === 'INCREASES_RISK' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {drv.direction === 'INCREASES_RISK' ? 'INCREASES_RISK' : 'DECREASES_RISK'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-gray-50 text-gray-600 rounded-lg border border-gray-200 text-xs space-y-1">
                <p className="font-semibold">⚠️ Model attribution does not prove physical root cause.</p>
                <p>These are model-attributed feature contributions (synthetic demonstration output). Physical maintenance inspection is required to verify any operational cause.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded border border-gray-200 text-sm text-gray-500 text-center">
              No precomputed risk-driver data is available for this machine.
            </div>
          )}
        </div>

        {/* Priority Panel */}
        <div className={`p-4 rounded-xl border space-y-4 ${
          isManualReview ? 'bg-amber-50 border-amber-300' :
          isCritical ? 'bg-red-50 border-red-200' :
          isMonitor ? 'bg-blue-50 border-blue-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <h3 className="font-semibold text-sm text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Priority & Decision Support
          </h3>

          <div className="flex flex-wrap items-start gap-6">
            <div>
              <span className="text-xs text-gray-500 font-medium block mb-1">Reference Risk Horizon</span>
              <span className="px-3 py-1 rounded font-semibold text-sm inline-block bg-white border border-gray-200 text-gray-700">
                14-Day
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-medium block mb-1">Data Sufficiency</span>
              <span className={`px-3 py-1 rounded font-bold text-sm inline-block ${
                suffStatus === 'GOOD' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {suffStatus}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-medium block mb-1">Decision Support Priority</span>
              <span className={`px-3 py-1 rounded font-bold text-sm inline-block ${
                decisionState === 'CRITICAL'      ? 'bg-red-100 text-red-700' :
                decisionState === 'MANUAL_REVIEW' ? 'bg-amber-200 text-amber-900' :
                decisionState === 'HIGH'          ? 'bg-orange-100 text-orange-700' :
                decisionState === 'WARNING'       ? 'bg-yellow-100 text-yellow-700' :
                decisionState === 'MEDIUM'        ? 'bg-blue-50 text-blue-700' :
                'bg-sky-50 text-sky-700'
              }`}>
                {decisionState}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500 font-medium block mb-1">Recommended Next Step</span>
              <p className="text-sm font-semibold text-gray-900">{getRecommendedAction()}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-medium block mb-1">Transparent Rationale</span>
              <p className="text-xs text-gray-600 leading-relaxed">{getPriorityRationale()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 8. Action Panel */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-base border-b pb-2 text-gray-900">Action Panel</h3>
        <div className="flex flex-wrap gap-3">
          {findingAck ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded text-sm font-medium">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Acknowledged</span>
              <span className="text-xs text-green-600">
                ({new Date(findingAck.acknowledged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            </div>
          ) : (
            <button
              onClick={handleAcknowledgeFinding}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
            >
              <CheckCircle className="w-4 h-4 text-green-600" /> Acknowledge Finding
            </button>
          )}

          <button
            onClick={handleCreateAction}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Create Maintenance Action
          </button>

          {matchedAlert && (
            <button
              onClick={() => navigate('/alerts')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-sm font-medium hover:bg-indigo-100"
            >
              <Bell className="w-4 h-4" /> Open Alerts
            </button>
          )}

          <button
            onClick={() => navigate('/c3')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded text-sm font-medium hover:bg-gray-100"
          >
            <ArrowLeftCircle className="w-4 h-4" /> Return to Fleet
          </button>
        </div>
      </div>

      {/* 9. About prototype */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setProtoInfoOpen(!protoInfoOpen)}
          className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-600 font-medium"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            About this prototype
          </span>
          {protoInfoOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {protoInfoOpen && (
          <div className="px-5 py-4 bg-white text-sm text-gray-600 space-y-1.5">
            <p>• All outputs are <strong>DEMO_PRECOMPUTED synthetic demonstration outputs</strong>. No live model inference runs in the browser.</p>
            <p>• No live machine telemetry is connected.</p>
            <p>• Risk scores are precomputed model outputs; higher scores indicate elevated maintenance risk over the stated horizon.</p>
            <p>• Failure-free probability values are from a separate survival / time-to-event model and are not derived from the risk scores.</p>
            <p>• Model-Attributed Feature Contributions are not proof of physical root cause. They do not confirm failure.</p>
            <p>• A machine with LIMITED data sufficiency is assigned MANUAL_REVIEW — risk score alone does not auto-escalate priority.</p>
            <p>• Physical maintenance inspection is required to verify any identified maintenance need.</p>
            <p>• Final deployment requires real maintenance-history data, model validation, and factory approval.</p>
          </div>
        )}
      </div>
    </div>
  );
}
