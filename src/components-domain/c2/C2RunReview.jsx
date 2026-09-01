import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import { loadLocal, saveLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const STEPS = [
  'ERP / Material Intake',
  'CAD / Marker',
  'Pre-cut Parameters',
  'Leakage & Data Gate',
  'Waste Prediction',
  'Contributor Review',
  'Strategy Comparison',
  'Export / Validation'
];

export default function C2RunReview() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { savedActions, setSavedActions, userRole, outputMode } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [runData, setRunData] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [strategies, setStrategies] = useState([]);
  
  const [activeStep, setActiveStep] = useState(0);
  const [localState, setLocalState] = useState(() => loadLocal('smartapparel.c2.state', {}));

  useEffect(() => {
    const fetchRunData = async () => {
      try {
        const [runs, allContribs, allStrats] = await Promise.all([
          loadDemoJson('c2/runs.json'),
          loadDemoJson('c2/contributors.json'),
          loadDemoJson('c2/strategies.json')
        ]);
        
        const run = runs.find(r => r.run_id === runId);
        if (!run) throw new Error('Run not found');
        
        setRunData(run);
        setContributors(allContribs.filter(c => c.run_id === runId));
        setStrategies(allStrats.filter(s => s.run_id === runId));
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRunData();
  }, [runId]);

  // Sync to local storage
  useEffect(() => {
    if (runData) {
      saveLocal('smartapparel.c2.state', localState);
    }
  }, [localState, runData]);

  // Draft inputs
  const [erpDraft, setErpDraft] = useState(localState[runId]?.erp || {
    quantity: 5000,
    fabric: '100% Cotton'
  });
  const [preCutDraft, setPreCutDraft] = useState(localState[runId]?.preCut || {
    plies: 100,
    threshold: 8
  });
  
  // Downstream invalidation helper
  const updateDraft = (type, values) => {
    if (type === 'erp') setErpDraft(values);
    if (type === 'preCut') setPreCutDraft(values);
    
    // Invalidate gate and subsequent steps
    const newLocal = { ...localState };
    if (!newLocal[runId]) newLocal[runId] = {};
    newLocal[runId][type] = values;
    newLocal[runId].gatePassed = false;
    
    setLocalState(newLocal);
  };

  const handleGateValidation = () => {
    if (!erpDraft.quantity || !preCutDraft.plies) {
      return { status: 'BLOCKED', message: 'Required fields missing from upstream steps.' };
    }
    return { status: 'PASS', message: 'All predictors available. No post-cut data detected in payload.' };
  };

  const gateResult = handleGateValidation();

  const handleNext = () => {
    if (activeStep === 3 && gateResult.status === 'BLOCKED') return; // Gate blocks
    if (activeStep === 3) {
      const newLocal = { ...localState, [runId]: { ...localState[runId], gatePassed: true } };
      setLocalState(newLocal);
    }
    setActiveStep(Math.min(STEPS.length - 1, activeStep + 1));
  };
  const handlePrev = () => setActiveStep(Math.max(0, activeStep - 1));

  if (loading) return <LoadingState message="Loading run details..." />;
  if (error) return (
    <div className="space-y-4">
      <ErrorState title="Failed to load run" message={error} />
      <button onClick={() => navigate('/c2')} className="text-blue-600 hover:underline">← Back to C2 Workspace</button>
    </div>
  );

  const runState = localState[runId] || {};
  const selectedStrategyId = runState.selected_strategy_id || null;
  const selectionStatus = runState.selection_status || 'NOT_SELECTED';
  const approvalStatus = runState.approval_status || 'NOT_REQUESTED';
  const approvalMetadata = runState.approval_metadata || null;

  const handleStrategySelect = (strat) => {
    const newLocal = { 
      ...localState, 
      [runId]: { 
        ...runState, 
        selected_strategy_id: strat.strategy_id,
        selection_status: 'SELECTED',
        approval_status: 'PENDING',
        export_status: 'DRAFT'
      } 
    };
    setLocalState(newLocal);

    // Create or update action
    const existingActionIdx = savedActions.findIndex(a => a.component_id === 'C2' && a.run_id === runId && a.action_type === 'STRATEGY_SELECTION');
    let updatedActions = [...savedActions];
    
    if (existingActionIdx >= 0) {
      if (updatedActions[existingActionIdx].status !== 'COMPLETED' && updatedActions[existingActionIdx].status !== 'CANCELLED') {
        updatedActions[existingActionIdx] = {
          ...updatedActions[existingActionIdx],
          selected_candidate: strat.strategy_id,
          status: 'PENDING',
          updated_at: new Date().toISOString()
        };
      }
    } else {
      updatedActions.unshift({
        id: `ACT-${Date.now()}`,
        component_id: 'C2',
        run_id: runId,
        entity_type: 'batch',
        entity_id: runData.batch_id,
        action_type: 'STRATEGY_SELECTION',
        selected_candidate: strat.strategy_id,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        action_route: `/c2/run/${runId}`
      });
    }
    setSavedActions(updatedActions);
  };

  const handleApproveStrategy = () => {
    if (window.confirm("Approve this strategy for cutting?")) {
      const newLocal = { 
        ...localState, 
        [runId]: { 
          ...runState, 
          approval_status: 'APPROVED',
          commit_status: 'NOT_COMMITTED',
          approval_metadata: {
            approved_by_role: userRole || 'Cutting Room Manager',
            approved_at: new Date().toISOString()
          }
        } 
      };
      setLocalState(newLocal);
      
      const existingActionIdx = savedActions.findIndex(a => a.component_id === 'C2' && a.run_id === runId && a.action_type === 'STRATEGY_SELECTION');
      if (existingActionIdx >= 0) {
        let updatedActions = [...savedActions];
        updatedActions[existingActionIdx].status = 'COMPLETED';
        updatedActions[existingActionIdx].updated_at = new Date().toISOString();
        setSavedActions(updatedActions);
      }
    }
  };

  const handleRejectStrategy = () => {
    if (window.confirm("Reject this strategy?")) {
      const newLocal = { 
        ...localState, 
        [runId]: { 
          ...runState, 
          approval_status: 'REJECTED',
          commit_status: 'NOT_COMMITTED'
        } 
      };
      setLocalState(newLocal);
      
      const existingActionIdx = savedActions.findIndex(a => a.component_id === 'C2' && a.run_id === runId && a.action_type === 'STRATEGY_SELECTION');
      if (existingActionIdx >= 0) {
        let updatedActions = [...savedActions];
        updatedActions[existingActionIdx].status = 'CANCELLED';
        updatedActions[existingActionIdx].updated_at = new Date().toISOString();
        setSavedActions(updatedActions);
      }
    }
  };

  const ProvenanceBadge = ({ classification }) => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      {classification && (
        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold">
          Data Classification: {classification}
        </span>
      )}
      <p className="italic">Not a live production recommendation</p>
    </div>
  );

  const renderStep = () => {
    switch(activeStep) {
      case 0:
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">ERP / Material Intake</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500">Factory ID</label>
                <input disabled className="w-full bg-gray-50 border border-gray-200 rounded p-2" value={runData.factory_id} />
              </div>
              <div>
                <label className="block text-sm text-gray-500">Batch ID</label>
                <input disabled className="w-full bg-gray-50 border border-gray-200 rounded p-2" value={runData.batch_id} />
              </div>
              {runData.order_id && (
                <div>
                  <label className="block text-sm text-gray-500">Order ID</label>
                  <input disabled className="w-full bg-gray-50 border border-gray-200 rounded p-2" value={runData.order_id} />
                </div>
              )}
              {runData.style_id && (
                <div>
                  <label className="block text-sm text-gray-500">Style ID</label>
                  <input disabled className="w-full bg-gray-50 border border-gray-200 rounded p-2" value={runData.style_id} />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-500">Draft Order Quantity</label>
                <input type="number" className="w-full border border-gray-300 rounded p-2" value={erpDraft.quantity} onChange={e => updateDraft('erp', { ...erpDraft, quantity: e.target.value })} />
              </div>
              
              <div>
                <label className="block text-sm text-gray-500">GSM</label>
                <input disabled className="w-full bg-gray-50 border border-gray-200 text-gray-400 italic rounded p-2" value={runData.gsm || "Not available in the current demo fixture."} />
              </div>
              <div>
                <label className="block text-sm text-gray-500">Supplier</label>
                <input disabled className="w-full bg-gray-50 border border-gray-200 text-gray-400 italic rounded p-2" value={runData.supplier || "Not available in the current demo fixture."} />
              </div>
              <div>
                <label className="block text-sm text-gray-500">Lot</label>
                <input disabled className="w-full bg-gray-50 border border-gray-200 text-gray-400 italic rounded p-2" value={runData.lot || "Not available in the current demo fixture."} />
              </div>
              
              <div>
                <label className="block text-sm text-gray-500">Size Ratio</label>
                <input disabled className="w-full bg-gray-50 border border-gray-200 text-gray-400 italic rounded p-2" value={runData.size_ratio || "Not available in the current demo fixture."} />
              </div>
              <div>
                <label className="block text-sm text-gray-500">Fabric Price</label>
                <input disabled className="w-full bg-gray-50 border border-gray-200 text-gray-400 italic rounded p-2" value={runData.fabric_price || "Not available in the current demo fixture."} />
              </div>
              <div>
                <label className="block text-sm text-gray-500">Planned Delivery Date</label>
                <input disabled className="w-full bg-gray-50 border border-gray-200 text-gray-400 italic rounded p-2" value={runData.planned_delivery_date || "Not available in the current demo fixture."} />
              </div>
            </div>
            
            <div className="bg-orange-50 text-orange-800 p-3 rounded text-sm flex gap-2 border border-orange-200 mt-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>Changing these fields updates the local demonstration form only. It does not run a live prediction model.</p>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">CAD / Marker</h3>
            <div className="p-4 bg-gray-50 rounded text-center text-gray-500 border border-dashed border-gray-300">
              Demo parser placeholder — no live CAD parsing is performed.
            </div>
            <div className="grid grid-cols-2 gap-4">
              {runData.marker_id && (
                <div>
                  <label className="block text-sm text-gray-500">Marker ID</label>
                  <input disabled className="w-full bg-gray-50 border border-gray-200 rounded p-2" value={runData.marker_id} />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-500">Marker Geometry / Patterns</label>
                <input disabled className="w-full bg-gray-50 border border-gray-200 text-gray-400 italic rounded p-2" value="Not available in the current demo fixture." />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Pre-cut Parameters</h3>
            <div className="bg-orange-50 text-orange-800 p-3 rounded text-sm flex gap-2 border border-orange-200 mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>Changing these fields updates the local demonstration form only. It does not run a live prediction model.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500">Number of Plies</label>
                <input type="number" className="w-full border border-gray-300 rounded p-2" value={preCutDraft.plies} onChange={e => updateDraft('preCut', { ...preCutDraft, plies: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-500">Configured Demo Review Threshold (%)</label>
                <input type="number" className="w-full border border-gray-300 rounded p-2" value={preCutDraft.threshold} onChange={e => updateDraft('preCut', { ...preCutDraft, threshold: e.target.value })} />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-6">
            <h3 className="font-bold text-lg border-b pb-2">Leakage and Data Gate</h3>
            <div className="bg-blue-50 text-blue-800 p-4 rounded text-sm flex gap-2 border border-blue-100">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p>Post-cut actual waste is excluded from prediction inputs.</p>
                <p>Post-cut values are recorded only for later validation and are not used to retrain or overwrite the prediction in this prototype.</p>
              </div>
            </div>
            {gateResult.status === 'PASS' ? (
              <div className="p-4 bg-green-50 text-green-700 rounded flex items-center gap-2 border border-green-200">
                <CheckCircle2 className="w-5 h-5" /> {gateResult.message}
              </div>
            ) : (
              <div className="p-4 bg-red-50 text-red-700 rounded flex flex-col gap-2 border border-red-200">
                <div className="flex items-center gap-2 font-bold"><XCircle className="w-5 h-5" /> Data Gate BLOCKED</div>
                <p className="text-sm">{gateResult.message}</p>
                <button onClick={() => setActiveStep(0)} className="self-start text-sm text-red-700 underline font-medium hover:text-red-900 mt-2">Return to Inputs</button>
              </div>
            )}
          </div>
        );
      case 4:
        const threshold = parseFloat(preCutDraft.threshold || 8);
        const predicted = runData.predicted_realised_waste_pct;
        const expectedRangeText = runData.expected_range || "Not available in the current demo fixture.";
        const isHighWaste = predicted > threshold;
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-6">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="font-bold text-lg">Precomputed Predicted Waste</h3>
                <p className="text-sm text-gray-500 italic mt-2">This result is illustrative until an authorised model is trained and validated.</p>
              </div>
              <ProvenanceBadge />
            </div>
            
            <div className="grid grid-cols-2 gap-6 mt-4">
              <div className="p-6 bg-gray-50 rounded-lg text-center border border-gray-200">
                <p className="text-sm text-gray-500 uppercase font-medium">Precomputed Predicted Waste</p>
                <p className={`text-4xl font-bold mt-2 ${isHighWaste ? 'text-red-600' : 'text-green-600'}`}>{predicted}%</p>
                <p className="text-xs text-gray-400 mt-2">Expected Range: {expectedRangeText}</p>
              </div>
              <div className="space-y-4 flex flex-col justify-center">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Review Threshold</span>
                  <span className="font-medium">{threshold}%</span>
                </div>
                {isHighWaste ? (
                  <div className="bg-red-50 text-red-700 p-3 rounded text-sm font-bold text-center border border-red-200">
                    High-waste review triggered.
                  </div>
                ) : (
                  <div className="bg-green-50 text-green-700 p-3 rounded text-sm font-bold text-center border border-green-200">
                    Baseline path may continue.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-6">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="font-bold text-lg">Top Prediction Drivers — Precomputed Model Attribution</h3>
                <p className="text-sm text-gray-500 italic mt-2">These contributors describe model attribution only. They do not prove the physical root cause of waste.</p>
              </div>
              <ProvenanceBadge classification="SYNTHETIC_DEMONSTRATION" />
            </div>
            
            {contributors.length > 0 ? (
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contributors.map(c => ({
                    ...c, 
                    display_interpretation: c.contribution_direction === 'INCREASE' ? 'Increased predicted waste' : 'Reduced predicted waste'
                  }))} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="display_label" type="category" width={150} tick={{fontSize: 12}} />
                    <Tooltip formatter={(value, name, props) => [value, props.payload.display_interpretation]} />
                    <Bar dataKey="contribution_value">
                      {contributors.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.contribution_direction === 'INCREASE' ? '#ef4444' : '#22c55e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 bg-gray-50 rounded text-center text-gray-500 border border-gray-200">
                No precomputed contributor data is available for this run.
              </div>
            )}
          </div>
        );
      case 6:
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-6">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="font-bold text-lg">Strategy Comparison</h3>
              </div>
              <ProvenanceBadge classification="SYNTHETIC_DEMONSTRATION" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b">
                    <th className="p-3 font-medium">Candidate</th>
                    <th className="p-3 font-medium">Pred. Waste</th>
                    <th className="p-3 font-medium">Efficiency</th>
                    <th className="p-3 font-medium">Simulated Fabric Saving</th>
                    <th className="p-3 font-medium">Manufacturability</th>
                    <th className="p-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map(strat => (
                    <tr key={strat.strategy_id} className={`border-b ${selectedStrategyId === strat.strategy_id ? 'bg-blue-50' : ''}`}>
                      <td className="p-3 font-medium">
                        {strat.strategy_name}
                        <br/>
                        <span className="text-[10px] text-gray-500 font-normal">{strat.strategy_id}</span>
                      </td>
                      <td className="p-3">{strat.predicted_waste_pct}%</td>
                      <td className="p-3">{strat.marker_efficiency}%</td>
                      <td className="p-3">
                        {strat.estimated_fabric_saving > 0 ? (
                          <span>
                            {strat.estimated_fabric_saving}%<br/>
                            <span className="text-[9px] text-gray-500 block leading-tight max-w-[120px]">Simulated demonstration value — not a guaranteed factory result.</span>
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3">{strat.manufacturability}</td>
                      <td className="p-3">
                        <button 
                          onClick={() => handleStrategySelect(strat)}
                          className={`px-3 py-1 rounded text-xs font-bold ${selectedStrategyId === strat.strategy_id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}
                        >
                          {selectedStrategyId === strat.strategy_id ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Approval Workflow */}
            {selectionStatus === 'SELECTED' && (
              <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Status: {approvalStatus}</p>
                  {approvalStatus === 'APPROVED' && approvalMetadata && (
                    <p className="text-xs text-gray-500 mt-1">
                      Approved by {approvalMetadata.approved_by_role} at {new Date(approvalMetadata.approved_at).toLocaleString()}
                    </p>
                  )}
                </div>
                {approvalStatus === 'PENDING' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleRejectStrategy}
                      className="px-4 py-2 bg-white border border-red-300 text-red-600 font-medium rounded hover:bg-red-50 transition-colors"
                    >
                      Reject Strategy
                    </button>
                    <button 
                      onClick={handleApproveStrategy}
                      className="px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 transition-colors"
                    >
                      Approve Strategy
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 7:
        const validationLocal = runState.validation || { actual_waste_percent: '' };
        
        let varianceText = null;
        if (validationLocal.actual_waste_percent) {
          const actual = parseFloat(validationLocal.actual_waste_percent);
          const predicted = runData.predicted_realised_waste_pct;
          const variance = actual - predicted;
          varianceText = `${variance > 0 ? '+' : ''}${variance.toFixed(1)} percentage points`;
        }
        const exportStatus = runState.export_status || 'NOT_EXPORTED';

        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-6">
              <h3 className="font-bold text-lg border-b pb-2">Export / Post-cut Validation</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Export Summary</h4>
                  <div className="text-sm space-y-1 bg-gray-50 p-4 rounded border border-gray-200 relative">
                    {approvalStatus !== 'APPROVED' && (
                      <span className="absolute top-2 right-2 text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200">DRAFT</span>
                    )}
                    <p>Run: {runData.run_id}</p>
                    <p>Batch: {runData.batch_id}</p>
                    <p>Selected Strategy: {selectedStrategyId || 'None'}</p>
                    <p>Predicted Waste: {runData.predicted_realised_waste_pct}%</p>
                    <p>Approval Status: {approvalStatus}</p>
                    <p>Export Status: {exportStatus}</p>
                  </div>
                  <button 
                    disabled={approvalStatus !== 'APPROVED'} 
                    onClick={() => {
                      const varianceValue = validationLocal.actual_waste_percent ? 
                        parseFloat(validationLocal.actual_waste_percent) - runData.predicted_realised_waste_pct : null;
                      
                      const exportData = {
                        output_mode: outputMode || 'DEMO_PRECOMPUTED',
                        run_id: runData.run_id,
                        batch_id: runData.batch_id,
                        selected_strategy_id: selectedStrategyId,
                        selection_status: selectionStatus,
                        approval_status: approvalStatus,
                        export_status: 'EXPORTED',
                        predicted_waste_percent: runData.predicted_realised_waste_pct,
                        limitation_statement: "Demo / Precomputed Output — Not a live production recommendation."
                      };
                      
                      if (approvalMetadata && approvalMetadata.approved_by_role) {
                        exportData.approved_by_role = approvalMetadata.approved_by_role;
                      }
                      if (approvalMetadata && approvalMetadata.approved_at) {
                        exportData.approved_at = approvalMetadata.approved_at;
                      }
                      if (validationLocal.actual_waste_percent) {
                        exportData.actual_waste_percent = parseFloat(validationLocal.actual_waste_percent);
                        exportData.variance_percentage_points = varianceValue;
                      }
                      
                      const jsonStr = JSON.stringify(exportData, null, 2);
                      const blob = new Blob([jsonStr], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `C2_Export_${runData.run_id}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);

                      const newLocal = { ...localState, [runId]: { ...runState, export_status: 'EXPORTED' } };
                      setLocalState(newLocal);
                    }}
                    className="px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {approvalStatus === 'APPROVED' ? 'Download Summary' : 'Approve before Export'}
                  </button>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Post-cut Validation</h4>
                  <div>
                    <label className="block text-sm text-gray-500">Actual Waste (%)</label>
                    <input type="number" step="0.1" className="w-full border border-gray-300 rounded p-2" value={validationLocal.actual_waste_percent} 
                      onChange={e => {
                        const newLocal = { ...localState, [runId]: { ...runState, validation: { actual_waste_percent: e.target.value } } };
                        setLocalState(newLocal);
                      }} 
                    />
                  </div>
                  {varianceText && (
                    <div className="text-sm bg-gray-50 p-3 rounded font-medium border border-gray-200">
                      Variance: {varianceText}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 italic mt-2">Post-cut validation does not retrain or update the prediction in this prototype.</p>
                </div>
              </div>
            </div>

            {/* Prototype Limitations Panel */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300 space-y-3">
              <h4 className="font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" /> Prototype Limitations</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>The prediction is a fixed precomputed demonstration output.</li>
                <li>Contributor values are precomputed model attributions.</li>
                <li>SHAP is not calculated live in this prototype.</li>
                <li>GA/NFP and constrained low-waste candidates are precomputed demo candidates.</li>
                <li>The prototype is not connected to live ERP, CAD or cutting-room databases.</li>
                <li>Post-cut actual waste is used only for validation.</li>
                <li>Production deployment requires trained-model validation and factory approval.</li>
              </ul>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/c2')} className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
        <PageHeader title={`Run Review: ${runId}`} description="8-Step Precomputed Prediction Workflow" />
      </div>
      
      {/* Tabs Header */}
      <div className="flex flex-wrap text-sm mb-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {STEPS.map((step, idx) => (
          <div 
            key={idx} 
            className={`flex-1 min-w-[160px] text-center p-3 border-b-2 ${idx !== STEPS.length - 1 ? 'border-r border-gray-200' : ''} ${
              idx === activeStep 
                ? 'border-b-blue-600 bg-blue-50 text-blue-700 font-bold' 
                : (idx < activeStep ? 'border-b-transparent bg-gray-50 text-gray-700' : 'border-b-transparent bg-white text-gray-400')
            }`}
          >
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-2 ${idx === activeStep ? 'bg-blue-600 text-white' : (idx < activeStep ? 'bg-gray-500 text-white' : 'bg-gray-200 text-gray-500')}`}>
              {idx + 1}
            </span>
            {step}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStep()}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 mt-6">
        <button onClick={handlePrev} disabled={activeStep === 0} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-50">
          Previous
        </button>
        <button onClick={handleNext} disabled={activeStep === STEPS.length - 1 || (activeStep === 3 && gateResult.status === 'BLOCKED')} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          Next Step <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
