import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import { loadLocal, saveLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { ArrowLeft, AlertTriangle, CheckCircle, Activity, Bell, Users, Settings, UserCheck } from 'lucide-react';

export default function C4AllocationReview() {
  const { lineId } = useParams();
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions, setSavedActions } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [lineRecord, setLineRecord] = useState(null);
  const [candidates, setCandidates] = useState([]);
  
  // Local state persistence
  const [c4State, setC4State] = useState({ allocations: {} });
  
  // What-if selection
  const [selectedScenario, setSelectedScenario] = useState('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c4Lines, sharedLines, cands] = await loadMultipleDemoJson([
          'c4/lines.json',
          'shared/lines.json',
          'c4/allocation_candidates.json'
        ]);
        
        const c4 = c4Lines.find(l => l.line_id === lineId);
        if (!c4) throw new Error('Line record not found in current demo fixture.');
        
        const shared = sharedLines.find(s => s.line_id === lineId);
        
        setLineRecord({
          ...c4,
          factory_id: shared ? shared.factory_id : 'Not available',
          name: shared ? shared.name : 'Unknown',
          status: shared ? shared.status : 'Unknown'
        });
        
        setCandidates((cands || []).filter(c => c.line_id === lineId));
        
        // Load persisted state
        const stored = loadLocal('smartapparel.c4.state', { allocations: {} });
        setC4State(stored);
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [lineId]);

  if (loading) return <LoadingState message="Loading Allocation Review..." />;
  if (error) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <ErrorState title="Failed to load line allocation data" message={error} />
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
    if (typeof val === 'number') return `${(val * 100).toFixed(0)}%`;
    return val;
  };

  const ProvenanceBadge = ({ outputMode, dataClassification }) => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> {outputMode || 'DEMO_PRECOMPUTED'} | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      {dataClassification && (
        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold">
          Data Classification: {dataClassification}
        </span>
      )}
      <p className="italic">Not a live production recommendation</p>
    </div>
  );
  
  // --- Allocation State Logic ---
  const getAllocState = (candId) => {
    return c4State.allocations[candId] || {
      selection_status: 'NOT_SELECTED',
      approval_status: 'NOT_REQUESTED',
      commit_status: 'NOT_COMMITTED'
    };
  };

  const updateAllocState = (candId, updates) => {
    const newState = {
      ...c4State,
      allocations: {
        ...c4State.allocations,
        [candId]: {
          ...getAllocState(candId),
          ...updates
        }
      }
    };
    setC4State(newState);
    saveLocal('smartapparel.c4.state', newState);
  };

  const handleSelect = (candId) => {
    updateAllocState(candId, {
      selection_status: 'SELECTED',
      approval_status: 'PENDING',
      commit_status: 'NOT_COMMITTED'
    });
  };

  const handleApprove = (candId) => {
    if (window.confirm("Approve this candidate for reallocation?")) {
      updateAllocState(candId, {
        approval_status: 'APPROVED',
        approved_at: new Date().toISOString(),
        approved_by_role: 'Production Manager'
      });
    }
  };
  
  const handleReject = (candId) => {
    updateAllocState(candId, {
      approval_status: 'REJECTED'
    });
  };

  const handleCommit = (candId) => {
    if (window.confirm("Commit this allocation? Note: This is a demo commit only and does not deploy live workforce changes.")) {
      updateAllocState(candId, {
        commit_status: 'COMMITTED',
        committed_at: new Date().toISOString(),
        committed_by_role: 'Production Manager'
      });
    }
  };

  const filteredCandidates = selectedScenario === 'ALL' 
    ? candidates 
    : candidates.filter(c => c.candidate_id === selectedScenario);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c4')} className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <PageHeader title={`Line Allocation Review: ${lineRecord.line_id}`} description={`Factory: ${lineRecord.factory_id} | Name: ${lineRecord.name}`} />
            <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 w-fit">
              <UserCheck className="w-3.5 h-3.5" /> Primary Users: Production Manager / Workforce Planner / Industrial Engineer
            </div>
          </div>
        </div>
        <ProvenanceBadge outputMode={lineRecord.output_mode} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Line Status */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-500" /> Line Status
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Line ID</span>
              <span className="font-bold text-gray-900">{lineRecord.line_id}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Factory ID</span>
              <span className="font-medium text-gray-700">{lineRecord.factory_id}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Status</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded font-medium border border-gray-200">{lineRecord.status}</span>
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
              <span className="text-gray-500">Precomputed Predicted Efficiency</span>
              <span className="font-bold text-gray-900">{formatEfficiency(lineRecord.predicted_efficiency)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Target Efficiency</span>
              <span className="font-bold text-gray-900">{formatEfficiency(lineRecord.target_efficiency)}</span>
            </div>
          </div>
        </div>

        {/* Bottleneck Review */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-gray-500" /> Bottleneck Review
          </h3>
          <div className="flex-1 flex flex-col justify-center">
            {lineRecord.workforce_alert_status === 'ACTIVE' ? (
              <div className="p-5 bg-orange-50 rounded-lg border border-orange-200 flex gap-3 text-orange-800">
                <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-orange-600" />
                <div>
                  <h4 className="font-bold text-lg mb-1">Recorded bottleneck indicator</h4>
                  <p className="text-sm">Requires production-team review</p>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500 text-sm">
                No bottleneck detail is available in the current demo fixture.
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button onClick={handleCreateReviewAction} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50">
              <Users className="w-4 h-4" /> Create Workforce Review Action
            </button>
          </div>
        </div>
      </div>
      
      {/* Allocation Candidates Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" /> Allocation Candidates
          </h3>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">What-if Scenario Selector:</label>
            <select 
              value={selectedScenario} 
              onChange={e => setSelectedScenario(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium"
            >
              <option value="ALL">Show All Precomputed Scenarios</option>
              {candidates.map(c => (
                <option key={c.candidate_id} value={c.candidate_id}>{c.scenario_label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mb-4 italic">
          What-if controls modify demonstration assumptions only. They do not run a live optimization or forecasting model.
        </p>

        {candidates.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded border border-gray-200 text-center text-gray-500">
            No allocation candidates available in the current demo fixture.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCandidates.map(cand => {
              const state = getAllocState(cand.candidate_id);
              return (
                <div key={cand.candidate_id} className={`p-5 rounded-lg border ${
                  state.commit_status === 'COMMITTED' ? 'bg-green-50 border-green-200' :
                  state.approval_status === 'REJECTED' ? 'bg-gray-50 border-gray-200 opacity-75' :
                  state.approval_status === 'APPROVED' ? 'bg-blue-50 border-blue-200' :
                  state.selection_status === 'SELECTED' ? 'bg-white border-blue-300 shadow-sm' :
                  'bg-white border-gray-200'
                }`}>
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg text-gray-900">{cand.scenario_label}</h4>
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{cand.candidate_id}</span>
                      </div>
                      <p className="text-sm text-gray-600">{cand.description}</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      {cand.simulated_predicted_efficiency !== undefined && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Simulated Predicted Efficiency</p>
                          <p className="text-lg font-bold text-green-700">{formatEfficiency(cand.simulated_predicted_efficiency)}</p>
                        </div>
                      )}
                      {cand.simulated_gain_percentage_points !== undefined && (
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded border border-green-200">
                          +{cand.simulated_gain_percentage_points} percentage points
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Target Operators</p>
                      <div className="flex flex-wrap gap-1">
                        {cand.operator_ids && cand.operator_ids.map(id => (
                          <span key={id} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium border border-gray-200">
                            {id}
                          </span>
                        ))}
                      </div>
                    </div>
                    {cand.constraint_notes && cand.constraint_notes.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Feasibility & Constraints</p>
                        <ul className="list-disc pl-4 text-xs text-gray-600 space-y-0.5">
                          {cand.constraint_notes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-orange-50 px-3 py-2 rounded text-xs text-orange-800 border border-orange-100 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{cand.limitation || "Simulated gain — not a guaranteed productivity result."}</span>
                  </div>
                  
                  {/* Action Bar */}
                  <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2 text-xs">
                      <span className={`px-2 py-1 rounded font-bold ${state.selection_status === 'SELECTED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {state.selection_status}
                      </span>
                      <span className={`px-2 py-1 rounded font-bold ${
                        state.approval_status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        state.approval_status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        state.approval_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {state.approval_status}
                      </span>
                      <span className={`px-2 py-1 rounded font-bold ${state.commit_status === 'COMMITTED' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                        {state.commit_status}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      {state.selection_status === 'NOT_SELECTED' && (
                        <button onClick={() => handleSelect(cand.candidate_id)} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
                          Select Candidate
                        </button>
                      )}
                      
                      {state.approval_status === 'PENDING' && (
                        <>
                          <button onClick={() => handleReject(cand.candidate_id)} className="px-4 py-1.5 bg-white border border-red-300 text-red-600 text-sm font-medium rounded hover:bg-red-50 transition-colors">
                            Reject
                          </button>
                          <button onClick={() => handleApprove(cand.candidate_id)} className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors">
                            Approve Candidate
                          </button>
                        </>
                      )}
                      
                      {state.approval_status === 'APPROVED' && state.commit_status === 'NOT_COMMITTED' && (
                        <button onClick={() => handleCommit(cand.candidate_id)} className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors">
                          Commit Allocation
                        </button>
                      )}
                      
                      {state.commit_status === 'COMMITTED' && (
                        <span className="px-4 py-1.5 bg-gray-100 text-gray-600 border border-gray-200 text-sm font-bold rounded flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Allocation Committed
                        </span>
                      )}
                    </div>
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prototype Limitations Notice */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300 space-y-3 mt-8">
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
