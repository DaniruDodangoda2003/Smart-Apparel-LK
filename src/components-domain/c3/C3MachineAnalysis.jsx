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
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  Bell, 
  Server, 
  Settings, 
  FileText, 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  History, 
  TrendingDown, 
  Layers 
} from 'lucide-react';

export default function C3MachineAnalysis() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions, setSavedActions } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [prediction, setPrediction] = useState(null);
  const [isLimitedScenario, setIsLimitedScenario] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [sufficiencyData, setSufficiencyData] = useState(null);
  const [survivalData, setSurvivalData] = useState(null);
  const [explanationData, setExplanationData] = useState(null);

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

        let predRecord = preds.find(p => p.machine_id === machineId);
        let limited = false;

        if (!predRecord) {
          // Check limited scenarios fixture
          const limitedRecord = limitedList.find(s => s.machine_id === machineId);
          if (limitedRecord) {
            predRecord = limitedRecord;
            limited = true;
          } else {
            // Check if machine exists in shared/machines
            const sharedMachine = machines.find(m => m.machine_id === machineId);
            if (sharedMachine) {
              // Fallback limited view for unpredicted active machine
              predRecord = {
                machine_id: sharedMachine.machine_id,
                display_code: sharedMachine.display_code,
                factory_id: sharedMachine.factory_id,
                line_id: sharedMachine.line_id,
                risk_7d: 0.60,
                risk_14d: 0.72,
                risk_30d: 0.81,
                data_sufficiency: 'LIMITED',
                priority: 'WARNING',
                output_mode: 'DEMO_PRECOMPUTED',
                data_classification: 'SYNTHETIC_DEMONSTRATION',
                scenario_title: 'Synthetic Research-Scenario Demonstration',
                decision_recommendation: 'Manual Review Recommended'
              };
              limited = true;
            } else {
              throw new Error('Machine record not found in current demo fixtures.');
            }
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

  if (loading) return <LoadingState message="Loading Machine Analysis..." />;
  if (error) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <ErrorState title="Failed to load machine analysis" message={error} />
      <button onClick={() => navigate('/c3')} className="text-blue-600 hover:underline flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to Fleet Overview</button>
    </div>
  );

  const matchedAlert = globalAlerts.find(a => a.component_id === 'C3' && a.entity_id === prediction.machine_id);

  // Finding acknowledgement logic (separate from action creation/completion)
  const findingAck = c3State.acknowledgements?.[prediction.machine_id];

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

    // Also update seed alert if matching
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

  const formatRiskValue = (val) => {
    if (typeof val === 'number') {
      return `${(val * 100).toFixed(0)}%`;
    }
    return val ?? 'N/A';
  };

  const ProvenanceBadge = () => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> {prediction.output_mode || 'DEMO_PRECOMPUTED'} | <span className="font-bold text-gray-700">Classification:</span> {prediction.data_classification || 'DEMO_PRECOMPUTED'}
      </div>
      <p className="italic">Not a live production recommendation</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* 1. Machine Identity / Context & Role Notice */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c3')} className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <PageHeader title={`Machine Analysis: ${prediction.display_code}`} description={`Machine ID: ${prediction.machine_id} | Factory: ${prediction.factory_id} | Line: ${prediction.line_id}`} />
            <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 w-fit">
              <UserCheck className="w-3.5 h-3.5" /> Primary User: Maintenance Manager / Supervisor
            </div>
          </div>
        </div>
        <ProvenanceBadge />
      </div>

      {/* Limited-Data Demonstration Notice if applicable */}
      {isLimitedScenario && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Synthetic Research-Scenario Demonstration</span>
            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-xs rounded">Not an official prediction fixture</span>
          </div>
          <p className="text-xs text-amber-700">
            This scenario demonstrates decision support under LIMITED data sufficiency. These values are provided only to demonstrate the intended research workflow and are not final experimental results.
          </p>
        </div>
      )}

      {/* 2. Predicted Maintenance Risk */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-500" /> Predicted Maintenance Risk
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-xs font-medium mb-1">Precomputed 7-day risk value</p>
            <p className="text-3xl font-bold text-gray-900">{formatRiskValue(prediction.risk_7d)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-xs font-medium mb-1">Precomputed 14-day risk value</p>
            <p className="text-3xl font-bold text-gray-900">{formatRiskValue(prediction.risk_14d)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-xs font-medium mb-1">Precomputed 30-day risk value</p>
            <p className="text-3xl font-bold text-gray-900">{formatRiskValue(prediction.risk_30d)}</p>
          </div>
        </div>
      </div>

      {/* 3. Maintenance History Summary */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" /> Maintenance History Summary
          </h3>
          <span className="text-xs text-gray-500 italic bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            Synthetic maintenance-history demonstration data
          </span>
        </div>

        {historyData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-gray-500 text-xs">History Coverage</p>
              <p className="font-bold text-gray-900 text-base">{historyData.history_days} days</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-gray-500 text-xs">Time Since Last Failure</p>
              <p className="font-bold text-gray-900 text-base">{historyData.time_since_last_failure_days} days</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-gray-500 text-xs">Time Since Last PM</p>
              <p className="font-bold text-gray-900 text-base">{historyData.time_since_last_pm_days} days</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-gray-500 text-xs">Failures (30d / 90d)</p>
              <p className="font-bold text-red-600 text-base">{historyData.failures_30d} / {historyData.failures_90d}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-gray-500 text-xs">Downtime (30d)</p>
              <p className="font-bold text-gray-900 text-base">{historyData.downtime_30d_hours} hrs</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-gray-500 text-xs">MTBF</p>
              <p className="font-bold text-gray-900 text-base">{historyData.mtbf_days} days</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-gray-500 text-xs">MTTR</p>
              <p className="font-bold text-gray-900 text-base">{historyData.mttr_hours} hrs</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-gray-500 text-xs">Repeat Faults (90d)</p>
              <p className="font-bold text-orange-600 text-base">{historyData.repeat_fault_count_90d}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic text-sm p-4 bg-gray-50 rounded text-center">
            No synthetic maintenance history available for this machine.
          </p>
        )}
      </div>

      {/* 4. Survival / Reliability Information */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-gray-500" /> Survival / Reliability Information
        </h3>
        
        {survivalData ? (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-gray-800">Failure-Free Probability — Synthetic Survival Demonstration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {survivalData.points.map(pt => (
                <div key={pt.horizon_days} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500">{pt.horizon_days}-Day Horizon</span>
                  <div className="my-2">
                    <span className="text-2xl font-bold text-slate-900">{(pt.failure_free_probability * 100).toFixed(0)}%</span>
                    <span className="text-xs text-slate-500 ml-1">failure-free prob.</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pt.failure_free_probability * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded border border-gray-200">
              This survival output is a precomputed synthetic demonstration and is not derived from the 7/14/30-day risk cards.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded text-center text-gray-400 italic text-sm">
            Not available in the current demo fixture.
          </div>
        )}
      </div>

      {/* 5. Data Sufficiency */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" /> Data Sufficiency
          </h3>
          <span className={`px-2.5 py-1 rounded text-xs font-bold ${
            (sufficiencyData?.data_sufficiency_status || prediction.data_sufficiency) === 'GOOD' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {sufficiencyData?.data_sufficiency_status || prediction.data_sufficiency}
          </span>
        </div>

        {sufficiencyData ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <span className="text-gray-500 text-xs block">History Coverage</span>
                <span className="font-bold text-gray-900">{sufficiencyData.history_days} days</span>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <span className="text-gray-500 text-xs block">Fault-Field Availability</span>
                <span className="font-bold text-gray-900">{(sufficiencyData.fault_field_availability * 100).toFixed(0)}%</span>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <span className="text-gray-500 text-xs block">Repair-Duration Availability</span>
                <span className="font-bold text-gray-900">{(sufficiencyData.repair_duration_availability * 100).toFixed(0)}%</span>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <span className="text-gray-500 text-xs block">PM History Available</span>
                <span className="font-bold text-gray-900">{sufficiencyData.pm_history_available ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 italic bg-blue-50/50 p-2.5 rounded border border-blue-100">
              {sufficiencyData.explanation}
            </p>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-gray-400 italic">
            <div className="flex justify-between py-1 border-b"><span>History Coverage</span><span>Not available...</span></div>
            <div className="flex justify-between py-1 border-b"><span>Fault-Field Availability</span><span>Not available...</span></div>
            <div className="flex justify-between py-1 border-b"><span>Repair-Duration</span><span>Not available...</span></div>
          </div>
        )}
      </div>

      {/* 6. Model-Attributed Risk Drivers (SHAP) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
          <Layers className="w-5 h-5 text-gray-500" /> Model-Attributed Risk Drivers — Synthetic Demonstration
        </h3>

        {explanationData ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {explanationData.drivers.map(drv => (
                <div key={drv.feature} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-gray-900 text-sm">{drv.feature}</span>
                    <span className="text-xs text-gray-500 ml-2">(value: {drv.feature_value})</span>
                    <p className="text-xs text-gray-600 mt-0.5">{drv.display_text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-red-600">SHAP +{drv.shap_value}</span>
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                      {drv.direction}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 text-xs space-y-1">
              <p className="font-bold">⚠️ Model Attribution Warning</p>
              <p>SHAP/model attribution does not prove physical root cause.</p>
              <p className="font-medium">Physical maintenance inspection is required to verify the operational cause.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded border border-gray-200 text-sm text-gray-500 text-center">
              No precomputed risk-driver data is available for this machine.
            </div>
            <div className="p-4 bg-orange-50 text-orange-800 rounded border border-orange-200 text-xs space-y-1">
              <p className="font-bold">Requires maintenance review</p>
              <p>Physical maintenance inspection is required to verify the operational cause.</p>
            </div>
          </div>
        )}
      </div>

      {/* 7. Maintenance Priority / Decision Support */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" /> Maintenance Priority & Decision Support
        </h3>

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <span className="text-xs text-gray-500 font-medium block">Maintenance Priority</span>
            <span className={`px-3 py-1 rounded font-bold text-sm inline-block mt-1 ${
              prediction.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
              prediction.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
              prediction.priority === 'WARNING' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {prediction.priority}
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-500 font-medium block">Decision Support Recommendation</span>
            <span className="font-bold text-slate-900 text-sm inline-block mt-1">
              {prediction.decision_recommendation || 'Physical Maintenance Inspection Recommended'}
            </span>
          </div>
        </div>

        {isLimitedScenario && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded">
            <p className="font-bold">Manual Review Recommended</p>
            <p className="mt-0.5">{prediction.decision_explanation || 'This is a demo decision-support rule based on limited evidence.'}</p>
          </div>
        )}
      </div>

      {/* 8. Action Panel */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-lg border-b pb-2">Action Panel</h3>
        <div className="flex flex-wrap gap-3">
          
          {findingAck ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded text-sm font-medium">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Acknowledged</span>
              <span className="text-xs text-green-600">({new Date(findingAck.acknowledged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
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
            onClick={handleCreateReviewAction} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            Create Maintenance Review Action
          </button>

          {matchedAlert && (
            <button 
              onClick={() => navigate('/alerts')} 
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-sm font-medium hover:bg-indigo-100"
            >
              <Bell className="w-4 h-4" /> Open Alerts
            </button>
          )}
        </div>
      </div>

      {/* 9. Prototype Limitations Notice */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300 space-y-3">
        <h4 className="font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" /> Prototype Limitations</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>The displayed prediction is a fixed precomputed demonstration output.</li>
          <li>No live machine-learning inference is executed in the browser.</li>
          <li>No live sensor or machine telemetry is connected.</li>
          <li>Risk drivers are model-attributed contributors, not proof of physical causality.</li>
          <li>Physical maintenance inspection is required.</li>
          <li>Production deployment requires real maintenance history, sensor integration, model validation and factory approval.</li>
        </ul>
      </div>

    </div>
  );
}
