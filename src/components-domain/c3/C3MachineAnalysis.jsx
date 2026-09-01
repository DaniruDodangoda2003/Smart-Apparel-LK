import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { loadLocal, saveLocal, STORAGE_KEYS } from '../../shared/storage/localStore';
import {
  ArrowLeft,
  CheckCircle,
  Activity,
  Bell,
  Settings,
  FileText,
  History,
  TrendingDown,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Info,
  ArrowLeftCircle,
  HelpCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  Area, AreaChart, ReferenceLine
} from 'recharts';

// Derive the decision state from priority + data sufficiency
function resolveDecisionState(priority, dataSufficiency) {
  if (dataSufficiency === 'LIMITED') return 'MANUAL REVIEW';
  if (priority === 'LOW') return 'MONITOR';
  return priority; // CRITICAL, HIGH, WARNING
}

export default function C3MachineAnalysis() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions, setSavedActions } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [prediction, setPrediction] = useState(null);
  const [machineInfo, setMachineInfo] = useState(null);
  const [isLimitedScenario, setIsLimitedScenario] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [sufficiencyData, setSufficiencyData] = useState(null);
  const [survivalData, setSurvivalData] = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [protoInfoOpen, setProtoInfoOpen] = useState(false);

  // Finding acknowledgement persisted separately in smartapparel.c3.state
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
              decision_recommendation: 'Manual Review Recommended'
            };
            limited = true;
          } else {
            throw new Error('Machine record not found in current demo fixtures.');
          }
        }

        setPrediction(predRecord);
        setIsLimitedScenario(limited);

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
  const findingAck = c3State.acknowledgements?.[prediction.machine_id];

  // Resolved decision state
  const decisionState = resolveDecisionState(prediction.priority, prediction.data_sufficiency);
  const isMonitor = decisionState === 'MONITOR';

  const handleAcknowledgeFinding = () => {
    const now = new Date().toISOString();
    const updatedAck = {
      ...c3State.acknowledgements,
      [prediction.machine_id]: {
        machine_id: prediction.machine_id,
        acknowledged: true,
        acknowledged_at: now
      }
    };
    const newState = { ...c3State, acknowledgements: updatedAck };
    setC3State(newState);
    saveLocal(STORAGE_KEYS.C3_STATE, newState);
    if (matchedAlert && matchedAlert.status === 'OPEN') {
      updateAlert(matchedAlert.alert_id, 'ACKNOWLEDGED');
    }
  };

  const handleCreateReviewAction = () => {
    const actionType = 'MAINTENANCE_REVIEW';
    const exists = savedActions.some(a =>
      a.component_id === 'C3' &&
      a.entity_id === prediction.machine_id &&
      a.action_type === actionType &&
      (a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
    );
    if (!exists) {
      const newAction = {
        id: `ACT-${Date.now()}`,
        component_id: 'C3',
        run_id: null,
        entity_type: 'machine',
        entity_id: prediction.machine_id,
        action_type: actionType,
        status: 'OPEN',
        created_at: new Date().toISOString(),
        action_route: `/c3/machine/${prediction.machine_id}`
      };
      setSavedActions([newAction, ...savedActions]);
      alert('Maintenance review action created successfully. View it in the Alerts & Actions page.');
    } else {
      alert('An active maintenance review action already exists for this machine.');
    }
  };

  // Format risk values as normalized scores (0-100)
  const formatRiskValue = (val) => {
    if (typeof val === 'number') return `${(val * 100).toFixed(0)}/100`;
    return val ?? 'N/A';
  };

  // Color scale for risk bars — purely visual, not probabilistic thresholds
  const getRiskColor = (val) => {
    if (val >= 0.7) return '#dc2626';
    if (val >= 0.5) return '#ea580c';
    if (val >= 0.3) return '#d97706';
    return '#16a34a';
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

  const suffStatus = sufficiencyData?.data_sufficiency_status || prediction.data_sufficiency;

  // Progress bar sub-component
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

  // Derive whether MAC-0045 has limited history details from the sufficiency fixture
  const limitedHistoryCoverage = sufficiencyData?.history_days ?? null;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* 1. Machine Identity / Context */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c3')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <PageHeader
              title={`${prediction.display_code} — Machine Analysis`}
              description={`${machineInfo?.machine_type || '—'} · ${prediction.factory_id} · ${prediction.line_id}`}
            />
            <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
              <span>Machine ID: <span className="font-medium text-gray-700">{prediction.machine_id}</span></span>
              {/* Machine Status comes from shared master-data fixture — separate from Decision Support State */}
              <span>
                Machine Status:{' '}
                <span className={`font-semibold ${
                  machineInfo?.status === 'ACTIVE'      ? 'text-green-600' :
                  machineInfo?.status === 'MAINTENANCE' ? 'text-amber-600' : 'text-gray-500'
                }`}>
                  {machineInfo?.status || '—'}
                </span>
                <span className="text-gray-400 font-normal ml-1">(operational status)</span>
              </span>
              <span>
                Decision Support State:{' '}
                <span className={`font-bold ${
                  decisionState === 'CRITICAL'     ? 'text-red-600'    :
                  decisionState === 'MANUAL REVIEW' ? 'text-amber-700' :
                  decisionState === 'MONITOR'       ? 'text-blue-600'  :
                  'text-gray-700'
                }`}>
                  {decisionState}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
          <Info className="w-3.5 h-3.5 text-gray-400" />
          <span>Demo Data · Precomputed Prototype Output</span>
        </div>
      </div>

      {/* Limited data notice */}
      {isLimitedScenario && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Limited Maintenance Evidence</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Only limited maintenance history is available for this machine. Interpret the prediction cautiously and perform a manual maintenance review before scheduling proactive work.
            </p>
          </div>
        </div>
      )}

      {/* 2. Predicted Maintenance Risk */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="border-b pb-2 flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2 text-gray-900">
            <Activity className="w-5 h-5 text-gray-500" /> Predicted Maintenance Risk
          </h3>
          <span className="text-[11px] text-gray-400 italic">Precomputed risk scores (demo output)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: '7-Day Risk Score', value: prediction.risk_7d },
            { label: '14-Day Risk Score', value: prediction.risk_14d },
            { label: '30-Day Risk Score', value: prediction.risk_30d }
          ].map(item => (
            <div key={item.label} className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
              <p className="text-gray-500 text-xs font-medium mb-1">{item.label}</p>
              <p className="text-3xl font-bold" style={{ color: getRiskColor(item.value) }}>
                {formatRiskValue(item.value)}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 italic">
          Risk scores are precomputed model outputs normalized to a 100-point scale. Higher scores indicate elevated maintenance risk over the stated horizon.
        </p>
      </div>

      {/* 3. Risk Horizon Chart */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-sm text-gray-900 mb-1">7 / 14 / 30-Day Risk Horizon</h3>
        <p className="text-[11px] text-gray-400 mb-3">Precomputed maintenance risk values across three prediction horizons</p>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={riskChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="horizon" fontSize={12} tick={{ fill: '#374151' }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}`} fontSize={12} tick={{ fill: '#6b7280' }} />
              <Tooltip
                formatter={(v) => [`${v}/100`, 'Risk Score']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="risk" radius={[4, 4, 0, 0]} barSize={40}>
                {riskChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getRiskColor(entry.raw)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Maintenance History Summary */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-base flex items-center gap-2 text-gray-900">
            <History className="w-5 h-5 text-gray-500" /> Maintenance History Summary
          </h3>
          <span className="text-[11px] text-gray-400 italic">Demo maintenance history</span>
        </div>

        {historyData ? (
          /* Full history available (MAC-0042) */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'History Coverage',       value: `${historyData.history_days} days`                   },
              { label: 'Time Since Last Failure', value: `${historyData.time_since_last_failure_days} days`  },
              { label: 'Time Since Last PM',      value: `${historyData.time_since_last_pm_days} days`       },
              { label: 'Failures (30d / 90d)',    value: `${historyData.failures_30d} / ${historyData.failures_90d}`, highlight: true },
              { label: 'Recent Downtime (30d)',   value: `${historyData.downtime_30d_hours} hrs`             },
              { label: 'MTBF',                    value: `${historyData.mtbf_days} days`                     },
              { label: 'MTTR',                    value: `${historyData.mttr_hours} hrs`                     },
              { label: 'Repeat Faults (90d)',     value: historyData.repeat_fault_count_90d, highlightOrange: true }
            ].map(item => (
              <div key={item.label} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-gray-500 text-xs">{item.label}</p>
                <p className={`font-bold text-base ${item.highlight ? 'text-red-600' : item.highlightOrange ? 'text-orange-600' : 'text-gray-900'}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        ) : isLimitedScenario && limitedHistoryCoverage !== null ? (
          /* Limited history available (MAC-0045): show what exists, mark the rest */
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Limited maintenance history available ({limitedHistoryCoverage} days of records). Some fields are unavailable in the current prototype data.</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-gray-500 text-xs">History Coverage</p>
                <p className="font-bold text-base text-gray-900">{limitedHistoryCoverage} days</p>
              </div>
              {[
                'Time Since Last Failure', 'Time Since Last PM',
                'Failures (30d / 90d)', 'Recent Downtime (30d)',
                'MTBF', 'MTTR', 'Repeat Faults (90d)'
              ].map(label => (
                <div key={label} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-gray-500 text-xs">{label}</p>
                  <p className="text-xs text-gray-400 italic mt-1">Not available in current prototype data</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* No history and no sufficiency coverage info */
          <div className="p-4 bg-gray-50 rounded text-center text-sm text-gray-500">
            <p>Detailed maintenance-history summary is not available for this machine in the current prototype data.</p>
            {sufficiencyData?.history_days && (
              <p className="mt-1">Data-sufficiency metadata indicates {sufficiencyData.history_days} days of historical coverage.</p>
            )}
          </div>
        )}
      </div>

      {/* 5. Failure-Free Probability Over Time (Survival) */}
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
                    <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${pt.failure_free_probability * 100}%` }} />
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
              Precomputed demo survival output from a separate survival/time-to-event model. These values are not derived from the risk horizon values above.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded text-center text-gray-400 italic text-sm">
            No precomputed survival data available for this machine in the current prototype data.
          </div>
        )}
      </div>

      {/* 6. Data Sufficiency — KEY RESEARCH DIFFERENTIATOR */}
      <div className={`p-5 rounded-xl border shadow-sm space-y-4 ${
        suffStatus === 'GOOD' ? 'bg-white border-gray-200' : 'bg-amber-50/30 border-amber-200'
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
                  <span className="text-gray-600 font-medium">PM History</span>
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
                { value: sufficiencyData.fault_field_availability,      label: 'Fault-Field Availability'      },
                { value: sufficiencyData.repair_duration_availability,  label: 'Repair-Duration Availability'  },
                { value: sufficiencyData.downtime_availability,         label: 'Downtime Availability'         }
              ].map(item => (
                <div key={item.label} className="p-3 bg-white rounded-lg border border-gray-100">
                  <ProgressBar value={item.value} label={item.label} />
                </div>
              ))}
            </div>
            <div className={`p-3 rounded-lg border text-xs ${
              suffStatus === 'GOOD'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <p className="font-medium">
                {suffStatus === 'GOOD'
                  ? 'Available maintenance history provides stronger supporting evidence for this prediction.'
                  : 'Only limited maintenance history is available. Interpret the prediction cautiously and perform a manual maintenance review before scheduling proactive work.'}
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
                Only limited maintenance history is available. Interpret the prediction cautiously and perform a manual maintenance review before scheduling proactive work.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 7. Model-Attributed Risk Drivers */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2 text-gray-900">
            <HelpCircle className="w-5 h-5 text-gray-500" /> {isMonitor ? 'What influenced this risk score?' : 'Why was this machine flagged?'}
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

            <div className="space-y-2">
              {shapChartData.map(drv => (
                <div key={drv.raw_feature} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{drv.display_text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Feature value: {drv.feature_value}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold ${drv.direction === 'INCREASES_RISK' ? 'text-red-600' : 'text-green-600'}`}>
                      {drv.direction === 'INCREASES_RISK' ? '+' : '−'}{drv.abs_value}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      drv.direction === 'INCREASES_RISK' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {drv.direction === 'INCREASES_RISK' ? 'Increased predicted risk' : 'Reduced predicted risk'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-gray-50 text-gray-600 rounded-lg border border-gray-200 text-xs space-y-1">
              <p className="font-semibold">⚠️ Model attribution does not prove physical root cause.</p>
              <p>
                {isMonitor
                  ? 'If a maintenance investigation is initiated, physical inspection should be used to verify the operational cause.'
                  : 'Physical maintenance inspection is required to verify the operational cause.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded border border-gray-200 text-sm text-gray-500 text-center">
            No precomputed risk-driver data is available for this machine.
          </div>
        )}
      </div>

      {/* 8. Maintenance Priority & Decision Support */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-base border-b pb-2 flex items-center gap-2 text-gray-900">
          <Settings className="w-5 h-5 text-gray-500" /> What should I do now?
        </h3>

        {isMonitor ? (
          /* LOW + GOOD: MONITOR path — no inspection recommendation */
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-xs text-blue-700 font-medium block">Maintenance Priority</span>
                <span className="px-3 py-1 rounded font-bold text-sm inline-block mt-1 bg-gray-100 text-gray-700">
                  {prediction.priority}
                </span>
              </div>
              <div>
                <span className="text-xs text-blue-700 font-medium block">Data Sufficiency</span>
                <span className="px-3 py-1 rounded font-bold text-sm inline-block mt-1 bg-emerald-100 text-emerald-700">
                  {prediction.data_sufficiency}
                </span>
              </div>
              <div>
                <span className="text-xs text-blue-700 font-medium block">Decision State</span>
                <span className="px-3 py-1 rounded font-bold text-sm inline-block mt-1 bg-blue-100 text-blue-700">
                  MONITOR
                </span>
              </div>
            </div>
            <div className="border-t border-blue-200 pt-3">
              <span className="text-xs text-blue-700 font-medium block mb-1">Recommended Next Step</span>
              <p className="text-sm text-blue-900 font-medium">
                Continue monitoring. No immediate maintenance review is required based on the current demo output.
              </p>
            </div>
          </div>
        ) : !isLimitedScenario ? (
          /* CRITICAL / WARNING + GOOD: proactive maintenance recommendation */
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-xs text-gray-500 font-medium block">Maintenance Priority</span>
                <span className={`px-3 py-1 rounded font-bold text-sm inline-block mt-1 ${
                  prediction.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                  prediction.priority === 'HIGH'     ? 'bg-orange-100 text-orange-700' :
                  prediction.priority === 'WARNING'  ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {prediction.priority}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium block">Data Sufficiency</span>
                <span className="px-3 py-1 rounded font-bold text-sm inline-block mt-1 bg-emerald-100 text-emerald-700">
                  {prediction.data_sufficiency}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium block">Decision State</span>
                <span className={`px-3 py-1 rounded font-bold text-sm inline-block mt-1 ${
                  prediction.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {prediction.priority}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <span className="text-xs text-gray-500 font-medium block mb-1">Recommended Next Step</span>
              <p className="text-sm text-gray-800 font-medium">
                Review the machine and schedule an inspection through the maintenance workflow.
              </p>
            </div>
          </div>
        ) : (
          /* LIMITED evidence: MANUAL REVIEW path */
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-xs text-amber-700 font-medium block">Risk Context</span>
                <span className="px-3 py-1 rounded font-bold text-sm inline-block mt-1 bg-orange-100 text-orange-700">
                  {prediction.priority === 'HIGH' ? 'Elevated' : prediction.priority}
                </span>
              </div>
              <div>
                <span className="text-xs text-amber-700 font-medium block">Data Sufficiency</span>
                <span className="px-3 py-1 rounded font-bold text-sm inline-block mt-1 bg-amber-100 text-amber-800">
                  LIMITED
                </span>
              </div>
              <div>
                <span className="text-xs text-amber-700 font-medium block">Decision Support State</span>
                <span className="px-3 py-1 rounded font-bold text-sm inline-block mt-1 bg-amber-200 text-amber-900">
                  MANUAL REVIEW
                </span>
              </div>
            </div>
            <div className="border-t border-amber-200 pt-3">
              <span className="text-xs text-amber-700 font-medium block mb-1">Recommended Next Step</span>
              <p className="text-sm text-amber-900 font-medium">
                Review available maintenance history and physically inspect the machine before scheduling proactive maintenance.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 9. Manager Action Panel */}
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

          {!isMonitor && (
            <button
              onClick={handleCreateReviewAction}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            >
              Create Maintenance Review Action
            </button>
          )}

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

      {/* 10. Collapsible About this prototype */}
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
            <p>• Prototype uses demo/precomputed model outputs.</p>
            <p>• No live model inference runs in the browser.</p>
            <p>• No live machine telemetry is connected.</p>
            <p>• Risk scores are precomputed model outputs; higher scores indicate elevated maintenance risk over the stated horizon.</p>
            <p>• Failure-free probability values are from a separate survival model and are not derived from the risk scores.</p>
            <p>• Model-attributed risk drivers are not proof of physical root cause.</p>
            <p>• Physical maintenance inspection is required to verify any identified maintenance need.</p>
            <p>• Final deployment requires real maintenance-history data, model validation and factory approval.</p>
            <p>• Sensor integration may be added where suitable data and infrastructure are available; it is not a mandatory core dependency.</p>
          </div>
        )}
      </div>
    </div>
  );
}
