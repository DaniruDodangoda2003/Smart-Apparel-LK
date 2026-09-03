import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { ArrowLeft, AlertTriangle, CheckCircle, Activity, Eye, Users, Bell, UserCheck, TrendingUp, TrendingDown, Sliders } from 'lucide-react';

export default function C4LineDiagnostics() {
  const { lineId } = useParams();
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions, setSavedActions } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lineRecord, setLineRecord] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [allLines, setAllLines] = useState([]);
  
  // What-if control
  const [wipSensitivity, setWipSensitivity] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c4Lines, sharedLines, diags] = await loadMultipleDemoJson([
          'c4/lines.json',
          'shared/lines.json',
          'c4/diagnostics.json'
        ]);
        
        const c4 = c4Lines.find(l => l.line_id === lineId);
        if (!c4) throw new Error('Line record not found in current demo fixture.');
        
        const shared = sharedLines.find(s => s.line_id === lineId);
        const lineDiag = (diags || []).find(d => d.line_id === lineId);
        
        setLineRecord({
          ...c4,
          factory_id: shared ? shared.factory_id : 'FAC-001',
          name: shared ? shared.name : 'Unknown',
          status: shared ? shared.status : 'Unknown'
        });
        setDiagnostics(lineDiag);
        setAllLines(c4Lines);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [lineId]);

  if (loading) return <LoadingState message="Loading Line Diagnostics..." />;
  if (error) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <ErrorState title="Failed to load line diagnostics data" message={error} />
      <button onClick={() => navigate('/c4')} className="text-blue-600 hover:underline flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to Workforce Overview</button>
    </div>
  );

  const matchedAlert = globalAlerts.find(a => a.component_id === 'C4' && a.entity_id === lineRecord.line_id);

  const handleAcknowledge = () => {
    if (matchedAlert) {
      updateAlert(matchedAlert.alert_id, 'ACKNOWLEDGED');
    }
  };

  const handleCreateReviewAction = () => {
    const actionType = 'WORKFORCE_REVIEW';
    const exists = savedActions.some(a => 
      a.component_id === 'C4' && 
      a.entity_id === lineRecord.line_id && 
      a.action_type === actionType &&
      (a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
    );

    if (!exists) {
      const newAction = {
        id: `ACT-${Date.now()}`,
        component_id: 'C4',
        run_id: null,
        entity_type: 'line',
        entity_id: lineRecord.line_id,
        action_type: actionType,
        status: 'OPEN',
        created_at: new Date().toISOString(),
        action_route: `/c4/allocation/${lineRecord.line_id}`
      };
      setSavedActions([newAction, ...savedActions]);
      alert('Workforce review action created successfully. View it in the Alerts & Actions page.');
    } else {
      alert('An active workforce review action already exists for this line.');
    }
  };

  const formatEfficiency = (val) => {
    if (typeof val === 'number') return `${(val * 100).toFixed(1)}%`;
    return val;
  };

  const formatDelta = (val) => {
    if (typeof val !== 'number') return val;
    const pct = (val * 100).toFixed(1);
    return val > 0 ? `+${pct}%` : `${pct}%`;
  };

  const ProvenanceBadge = () => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> {diagnostics ? diagnostics.output_mode : (lineRecord.output_mode || 'DEMO_PRECOMPUTED')} | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      {diagnostics && diagnostics.data_classification && (
        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold">
          Data Classification: {diagnostics.data_classification}
        </span>
      )}
      <p className="italic">Not a live production recommendation</p>
    </div>
  );

  // SHAP Waterfall calculations
  let totalImpact = 0;
  if (diagnostics && diagnostics.contributors) {
    totalImpact = diagnostics.contributors.reduce((sum, c) => sum + c.contribution_score, 0);
  }
  
  // Calculate simulated prediction based on sensitivity slider (+/- 0.05 max impact)
  const sensitivityImpact = (wipSensitivity / 100) * 0.05;
  const basePredicted = lineRecord.predicted_efficiency;
  const simulatedPredicted = basePredicted + sensitivityImpact;
  
  const baselineEfficiency = basePredicted - totalImpact;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c4')} className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <PageHeader title={`Line Diagnostics`} description={`Analyze model attributions for line performance.`} />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Line Selector:</span>
              <select 
                value={lineId} 
                onChange={(e) => navigate(`/c4/line/${e.target.value}`)}
                className="border border-gray-300 rounded px-2 py-1 text-sm font-bold text-blue-700 bg-white"
              >
                {allLines.map(l => (
                  <option key={l.line_id} value={l.line_id}>{l.line_id} - {l.current_style}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <ProvenanceBadge />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Status */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-500" /> Line Details
          </h3>
          <div className="space-y-3 text-sm flex-1">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Line ID</span>
              <span className="font-bold text-gray-900">{lineRecord.line_id}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Current Style</span>
              <span className="font-medium text-gray-700">{lineRecord.current_style || 'Unknown'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Staffing Level</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold border border-blue-200">{lineRecord.staffing_level}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Workforce Alert Status</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-medium border border-gray-200">{lineRecord.workforce_alert_status}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Target Efficiency</span>
              <span className="font-bold text-gray-900">{formatEfficiency(lineRecord.target_efficiency)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 bg-blue-50 -mx-2 px-2">
              <span className="text-blue-700 font-semibold">Predicted Efficiency</span>
              <span className="font-bold text-blue-900 text-lg">{formatEfficiency(simulatedPredicted)}</span>
            </div>
          </div>
          
          <div className="mt-6 flex flex-col gap-2">
            {matchedAlert && matchedAlert.status === 'OPEN' && (
              <button onClick={handleAcknowledge} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50">
                <CheckCircle className="w-4 h-4 text-green-600" /> Acknowledge Finding
              </button>
            )}
            <button onClick={() => navigate('/c4/operators')} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-sm font-medium hover:bg-indigo-100">
              <UserCheck className="w-4 h-4" /> View Operator Skill Profiles
            </button>
            <button onClick={() => navigate(`/c4/allocation/${lineRecord.line_id}`)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
              <Eye className="w-4 h-4" /> Open Allocation Review
            </button>
            <button onClick={handleCreateReviewAction} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50">
              <Users className="w-4 h-4" /> Create Workforce Review Action
            </button>
          </div>
        </div>

        {/* Model-Attributed Contributors (SHAP) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg border-b pb-2 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" /> Model-Attributed Workforce Contributors
            </div>
          </h3>
          
          {diagnostics ? (
            <div className="flex-1 space-y-6">
              
              {/* SHAP Waterfall */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">Deterministic Output Impact (Synthetic Waterfall)</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded border border-gray-200">
                    <span className="font-bold text-gray-700 text-sm">Baseline Efficiency</span>
                    <span className="font-bold">{formatEfficiency(baselineEfficiency)}</span>
                  </div>
                  
                  {diagnostics.contributors.map((contrib, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 px-3 pl-8">
                      <span className="text-sm text-gray-600">{contrib.display_label}</span>
                      <span className={`text-sm font-bold ${contrib.contribution_score > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {contrib.contribution_score > 0 ? '+' : ''}{(contrib.contribution_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  
                  {sensitivityImpact !== 0 && (
                    <div className="flex justify-between items-center py-2 px-3 pl-8 bg-blue-50 rounded text-blue-800">
                      <span className="text-sm font-medium">What-If Sensitivity Adjustment</span>
                      <span className={`text-sm font-bold ${sensitivityImpact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {sensitivityImpact > 0 ? '+' : ''}{(sensitivityImpact * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 px-3 bg-blue-100 rounded border border-blue-200">
                    <span className="font-bold text-blue-900 text-sm">Predicted Efficiency</span>
                    <span className="font-bold text-blue-900 text-lg">{formatEfficiency(simulatedPredicted)}</span>
                  </div>
                </div>
              </div>

              {/* What-If Sensitivity Control */}
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sliders className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-bold text-gray-700">Prototype What-If Sensitivity</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 w-24">WIP Adjustment</span>
                  <input 
                    type="range" 
                    min="-50" max="50" value={wipSensitivity} 
                    onChange={(e) => setWipSensitivity(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs font-bold text-blue-700 w-12 text-right">{wipSensitivity > 0 ? '+' : ''}{wipSensitivity}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic">Updates displayed deterministic scenario outputs.</p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 text-sm text-orange-800 flex gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold mb-1">Requires Production-Team Review</p>
                  <p>{diagnostics.limitation}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 rounded border border-gray-100 text-gray-500 text-center">
              No precomputed workforce-contributor data is available for this line.
            </div>
          )}
        </div>
      </div>

      {/* Operation-Level Breakdown */}
      {diagnostics && diagnostics.operation_breakdown && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-800 text-sm">Operation-Level Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  <th className="p-3 font-medium">Operation Seq</th>
                  <th className="p-3 font-medium">Operation Name</th>
                  <th className="p-3 font-medium">Machine Type</th>
                  <th className="p-3 font-medium">Required SMV</th>
                  <th className="p-3 font-medium">Current Operator</th>
                  <th className="p-3 font-medium">Operator Rating</th>
                  <th className="p-3 font-medium">Bottleneck Severity</th>
                </tr>
              </thead>
              <tbody>
                {diagnostics.operation_breakdown.map((op, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-700">{op.operation_seq}</td>
                    <td className="p-3 font-medium text-gray-900">{op.operation_name}</td>
                    <td className="p-3 text-gray-600">{op.machine_type}</td>
                    <td className="p-3 text-gray-600">{op.required_smv.toFixed(2)}</td>
                    <td className={`p-3 font-medium ${op.current_operator.includes('Absent') ? 'text-red-600' : 'text-gray-800'}`}>
                      {op.current_operator}
                    </td>
                    <td className="p-3 text-gray-600">{op.operator_rating}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded font-bold text-[10px] uppercase border ${
                        op.bottleneck_severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' :
                        op.bottleneck_severity === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {op.bottleneck_severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prototype Limitations Notice */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300 space-y-3 mt-6">
        <h4 className="font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" /> Prototype Limitations</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Workforce forecasts are fixed precomputed demonstration outputs.</li>
          <li>Model attributions do not prove operational or employee-level causation.</li>
          <li>Extended operator skill profiles are synthetic demonstration data.</li>
          <li>Allocation candidates are precomputed demonstration candidates.</li>
          <li>Simulated gains are not guaranteed productivity results.</li>
          <li>No live HR, attendance, production or skill-matrix system is connected.</li>
          <li>Human approval and factory validation are required.</li>
        </ul>
      </div>
    </div>
  );
}
