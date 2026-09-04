import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import { useAppContext } from '../../shared/context/AppContext';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import PageHeader from '../../shared/components/PageHeader';
import { CheckCircle, AlertTriangle, XCircle, ChevronRight, ChevronLeft, Activity, ShieldAlert, Users, Save, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

export default function C4RunWorkflow() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { userRole } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [run, setRun] = useState(null);
  const [workers, setWorkers] = useState([]);
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;

  const [proposedRoster, setProposedRoster] = useState([]);
  const [rosterSummary, setRosterSummary] = useState({});

  // Local state for approval process
  const [decisionNotes, setDecisionNotes] = useState('');

  useEffect(() => {
    if (run && workers.length > 0) {
      const allocatedWorkers = new Set();
      const roster = [];
      let covered = 0;
      let constraintsResolved = 0;

      run.line_requirements.required_operations.forEach(reqOp => {
        const candidates = run.matching_constraints
          .filter(mc => mc.operation === reqOp && mc.status === 'PASS' && !allocatedWorkers.has(mc.worker))
          .sort((a, b) => b.match_score - a.match_score);
          
        if (candidates.length > 0) {
          const selected = candidates[0];
          allocatedWorkers.add(selected.worker);
          const workerProfile = workers.find(w => w.operator_id === selected.worker);
          
          let reason = 'Highest suitable match score';
          if (reqOp === 'Overlock') reason = 'Highest eligible Overlock match';
          else if (reqOp === 'Flatlock') reason = 'Best available Flatlock-compatible operator';
          else if (reqOp === 'Single Needle') reason = 'Strongest eligible Single Needle match';

          roster.push({
            worker_id: selected.worker,
            name: workerProfile ? workerProfile.display_name : selected.worker,
            operation: reqOp,
            machine: reqOp === 'Overlock' ? 'Juki MO-6800' : reqOp === 'Flatlock' ? 'Pegasus W500' : 'Brother S-7100A',
            match_score: selected.match_score,
            reason
          });
          covered++;
          constraintsResolved++;
        }
      });
      
      const excluded = run.matching_constraints.filter(mc => mc.status === 'NOT RECOMMENDED').length;

      setProposedRoster(roster);
      setRosterSummary({
        coveredOperations: covered,
        totalOperations: run.line_requirements.required_operations.length,
        eligibleSelected: covered,
        constraintsResolved: constraintsResolved,
        excludedLowFit: excluded
      });
    }
  }, [run, workers]);

  const shapData = run?.shap_contributors || [];
  const efficiencyData = run?.comparison ? [
    { name: 'Current', efficiency: Number((run.comparison.baseline.efficiency * 100).toFixed(1)) },
    { name: 'Recommended', efficiency: Number((run.comparison.recommended.efficiency * 100).toFixed(1)) }
  ] : [];

  useEffect(() => {
    const fetchRunData = async () => {
      try {
        const [runs, skillProfiles] = await Promise.all([
          loadDemoJson('c4/runs.json'),
          loadDemoJson('c4/skill_profiles.json')
        ]);
        const found = runs.find(r => r.run_id === runId);
        if (!found) throw new Error(`Run ${runId} not found`);
        
        setRun(found);
        setWorkers(skillProfiles);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRunData();
  }, [runId]);

  if (loading) return <LoadingState message="Loading run workflow..." />;
  if (error) return <ErrorState title="Failed to load run" message={error} />;

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleDecision = (action) => {
    alert(`Allocation ${action} recorded for ${runId}.`);
    navigate('/c4');
  };

  const steps = [
    "Line Requirements",
    "Workforce Pool",
    "Predicted Productivity",
    "SHAP Explainability",
    "Constraints & Matching",
    "Allocations",
    "Current vs Recommended",
    "Final Decision"
  ];

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title={`Workforce Allocation Review: ${run.run_id}`} 
          description={`Line: ${run.line_id} | Style: ${run.style_id} | Shift: ${run.shift}`} 
        />
        <div className="text-right">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border
            ${run.allocation_status === 'APPROVED' ? 'bg-green-100 text-green-700 border-green-200' : 
              run.allocation_status === 'PENDING' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
              'bg-gray-100 text-gray-700 border-gray-200'}`}>
            Status: {run.allocation_status}
          </span>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-100 -z-10 -translate-y-1/2"></div>
          {steps.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = stepNum === currentStep;
            const isPast = stepNum < currentStep;
            
            return (
              <div key={stepNum} className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setCurrentStep(stepNum)}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                  ${isActive ? 'bg-blue-600 text-white border-blue-600' : 
                    isPast ? 'bg-blue-100 text-blue-600 border-blue-200' : 
                    'bg-white text-gray-400 border-gray-200'}`}>
                  {isPast ? <CheckCircle className="w-5 h-5" /> : stepNum}
                </div>
                <span className={`text-[10px] font-semibold text-center w-20 leading-tight ${isActive ? 'text-blue-700' : isPast ? 'text-gray-700' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] flex flex-col">
        <div className="p-6 flex-1 border-b border-gray-100">
          
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-gray-800 mb-6">1. Production Line Requirements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Line ID</label>
                    <input type="text" defaultValue={run.line_id} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Garment Style</label>
                    <input type="text" defaultValue={run.style_id} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Output (Units)</label>
                    <input type="number" defaultValue={run.line_requirements.target_output} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm font-semibold text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Required SMV</label>
                    <input type="number" step="0.1" defaultValue={run.line_requirements.smv} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Required Workers</label>
                    <input type="number" defaultValue={run.line_requirements.required_workers} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Planned Hours</label>
                    <input type="number" defaultValue={run.line_requirements.planned_hours} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Overtime Limit (Hours)</label>
                    <input type="number" defaultValue={run.line_requirements.overtime_limit_hours} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Required Operations</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {run.line_requirements.required_operations.map(op => (
                        <span key={op} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-200">{op}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-gray-800 mb-4">2. Workforce and Skill Profiles</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b">
                      <th className="p-3 font-medium">Worker ID</th>
                      <th className="p-3 font-medium">Name</th>
                      <th className="p-3 font-medium">Competency</th>
                      <th className="p-3 font-medium">Primary Op</th>
                      <th className="p-3 font-medium">Exp (Yrs)</th>
                      <th className="p-3 font-medium">Attendance</th>
                      <th className="p-3 font-medium text-right">Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map(w => (
                      <tr key={w.operator_id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-700">{w.operator_id}</td>
                        <td className="p-3 font-medium">{w.display_name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${w.grade === 'Grade A' ? 'bg-green-100 text-green-700' : w.grade === 'Grade B' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{w.grade}</span>
                        </td>
                        <td className="p-3">{w.primary_machine}</td>
                        <td className="p-3">{w.years_of_experience || '-'}</td>
                        <td className="p-3">{(w.attendance_rate * 100).toFixed(0)}%</td>
                        <td className="p-3 text-right">
                          <span className={`text-xs font-bold ${w.availability === 'AVAILABLE' ? 'text-green-600' : 'text-orange-500'}`}>{w.availability}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-gray-800 mb-6">3. Predicted Productivity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-5 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-center">
                  <p className="text-sm font-medium text-gray-500">Predicted Productivity</p>
                  <p className={`text-3xl font-bold mt-1 ${run.prediction_kpis.predicted_productivity < run.prediction_kpis.target_productivity ? 'text-red-600' : 'text-green-600'}`}>
                    {(run.prediction_kpis.predicted_productivity * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Target: {(run.prediction_kpis.target_productivity * 100).toFixed(1)}%</p>
                </div>
                <div className="p-5 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-center">
                  <p className="text-sm font-medium text-gray-500">Predicted Output</p>
                  <p className="text-3xl font-bold mt-1 text-gray-900">{run.prediction_kpis.predicted_output}</p>
                  <p className="text-xs text-gray-400 mt-1">Target: {run.line_requirements.target_output}</p>
                </div>
                <div className="p-5 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-center">
                  <p className="text-sm font-medium text-gray-500">Output Gap</p>
                  <p className={`text-3xl font-bold mt-1 ${run.prediction_kpis.output_gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {run.prediction_kpis.output_gap > 0 ? `-${run.prediction_kpis.output_gap}` : 'Met Target'}
                  </p>
                </div>
                <div className={`p-5 rounded-xl border flex flex-col justify-center
                  ${run.risk_level === 'HIGH' ? 'bg-red-50 border-red-200' : run.risk_level === 'LOW' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                  <p className={`text-sm font-medium ${run.risk_level === 'HIGH' ? 'text-red-700' : run.risk_level === 'LOW' ? 'text-green-700' : 'text-orange-700'}`}>Risk Level</p>
                  <p className={`text-3xl font-bold mt-1 ${run.risk_level === 'HIGH' ? 'text-red-700' : run.risk_level === 'LOW' ? 'text-green-700' : 'text-orange-700'}`}>
                    {run.risk_level}
                  </p>
                  <p className="text-xs opacity-80 mt-1 text-inherit">Confidence: {run.prediction_kpis.confidence}</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3 text-blue-800 text-sm">
                <Activity className="w-5 h-5 flex-shrink-0" />
                <p>This prediction was generated using the currently active validated model for Component 4. Predictions are based on the workforce pool characteristics, not actual causation. Proceed to the next step to review SHAP explanations.</p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
              <h2 className="text-xl font-bold text-gray-800 mb-2">4. SHAP Explainability</h2>
              <p className="text-sm text-gray-500 mb-6">Contribution to predicted productivity (Model Attribution)</p>
              
              <div className="w-full min-w-0 mt-4">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={shapData} layout="vertical" margin={{ top: 5, right: 30, left: 140, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="feature" type="category" tick={{fontSize: 12, fontWeight: 600, fill: '#374151'}} width={140} />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs max-w-[200px]">
                              <p className="font-bold border-b border-slate-700 pb-1 mb-1">{data.feature}</p>
                              <p className="text-slate-300">Value: <span className="text-white">{data.value}</span></p>
                              <p className="text-slate-300">Impact: <span className={data.impact === 'positive' ? 'text-green-400' : 'text-red-400'}>{(data.magnitude * 100).toFixed(1)}%</span></p>
                              <p className="mt-2 text-slate-400 leading-tight">{data.interpretation}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="magnitude" radius={[0, 4, 4, 0]} barSize={24}>
                      {shapData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.impact === 'positive' ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-gray-800 mb-6">5. Skill Matching & Constraint Check</h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-3 font-medium text-gray-600">Operator</th>
                      <th className="p-3 font-medium text-gray-600">Candidate Operation</th>
                      <th className="p-3 font-medium text-gray-600 text-center">Match Score</th>
                      <th className="p-3 font-medium text-gray-600 text-center">Status</th>
                      <th className="p-3 font-medium text-gray-600">Constraint Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {run.matching_constraints.map((mc, idx) => (
                      <tr key={idx} className="bg-white hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-bold text-gray-700">{mc.worker}</td>
                        <td className="p-3">{mc.operation}</td>
                        <td className="p-3 text-center">
                          <span className={`font-semibold ${mc.match_score >= 80 ? 'text-green-600' : mc.match_score >= 60 ? 'text-orange-500' : 'text-red-600'}`}>
                            {mc.match_score}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {mc.status === 'PASS' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700"><CheckCircle className="w-3 h-3"/> PASS</span>}
                          {mc.status === 'REVIEW' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700"><AlertTriangle className="w-3 h-3"/> REVIEW</span>}
                          {(mc.status === 'BLOCKED' || mc.status === 'NOT RECOMMENDED') && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700"><XCircle className="w-3 h-3"/> {mc.status}</span>}
                        </td>
                        <td className="p-3 text-xs text-gray-500 italic">{mc.note || 'No conflicts detected.'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-gray-800 mb-6">6. Workforce Allocation Recommendation</h2>
              <div className="border border-indigo-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-200 flex items-center justify-between">
                  <h3 className="font-bold text-indigo-900 flex items-center gap-2"><Users className="w-5 h-5"/> Proposed Roster</h3>
                  <span className="text-xs font-semibold text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-200">Recommended Allocation</span>
                </div>
                <div className="bg-white px-4 py-3 border-b border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-gray-500">Operations Covered:</span> <span className="font-bold text-gray-800">{rosterSummary.coveredOperations}/{rosterSummary.totalOperations}</span></div>
                  <div><span className="text-gray-500">Eligible Workers Selected:</span> <span className="font-bold text-gray-800">{rosterSummary.eligibleSelected}</span></div>
                  <div><span className="text-gray-500">Constraints Resolved:</span> <span className="font-bold text-gray-800">{rosterSummary.constraintsResolved}</span></div>
                  <div><span className="text-gray-500">Excluded Low-Fit:</span> <span className="font-bold text-gray-800">{rosterSummary.excludedLowFit}</span></div>
                </div>
                <table className="w-full text-left text-sm bg-white">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="p-3 font-medium">Worker ID</th>
                      <th className="p-3 font-medium">Name</th>
                      <th className="p-3 font-medium">Operation</th>
                      <th className="p-3 font-medium">Machine</th>
                      <th className="p-3 font-medium">Match</th>
                      <th className="p-3 font-medium">Selection Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {proposedRoster.map(r => (
                      <tr key={r.worker_id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-indigo-600">{r.worker_id}</td>
                        <td className="p-3 font-medium text-gray-800">{r.name}</td>
                        <td className="p-3">{r.operation}</td>
                        <td className="p-3 text-gray-600 text-xs">{r.machine}</td>
                        <td className="p-3">
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{r.match_score}%</span>
                        </td>
                        <td className="p-3 text-xs text-gray-500 italic">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
              <h2 className="text-xl font-bold text-gray-800 mb-6">7. Current vs Recommended Comparison</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Efficiency</p>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-900 line-through opacity-50">{(run.comparison.baseline.efficiency * 100).toFixed(1)}%</span>
                    <span className="text-2xl font-bold text-green-600">{(run.comparison.recommended.efficiency * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Output Units</p>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-900 line-through opacity-50">{run.comparison.baseline.output}</span>
                    <span className="text-2xl font-bold text-blue-600">{run.comparison.recommended.output}</span>
                  </div>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Idle Time (Mins)</p>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-900 line-through opacity-50">{run.comparison.baseline.idle_time_mins}</span>
                    <span className="text-2xl font-bold text-green-600">{run.comparison.recommended.idle_time_mins}</span>
                  </div>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bottlenecks</p>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-900 line-through opacity-50">{run.comparison.baseline.bottlenecks}</span>
                    <span className="text-2xl font-bold text-green-600">{run.comparison.recommended.bottlenecks}</span>
                  </div>
                </div>
              </div>

              <div className="w-full min-w-0 bg-white border border-gray-200 rounded-lg p-6 mt-4">
                <h3 className="text-sm font-bold text-gray-700 mb-4 text-center">Efficiency Improvement</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={efficiencyData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12, fontWeight: 600}} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} formatter={(value) => [`${value}%`, 'Efficiency']} />
                    <Bar dataKey="efficiency" barSize={32} radius={[0, 4, 4, 0]}>
                      {efficiencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Current' ? '#9ca3af' : '#2563eb'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {currentStep === 8 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-gray-800 mb-6">8. Manager Review & Final Decision</h2>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 mb-6">
                <h3 className="font-bold text-yellow-800 flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-5 h-5"/> Human-in-the-Loop Verification Required
                </h3>
                <p className="text-sm text-yellow-700">
                  The AI-generated workforce allocation recommendation is a decision-support tool. 
                  As the Production Manager, you must verify the assignments against physical line conditions and worker constraints before finalizing.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Manager Notes / Modifications</label>
                  <textarea 
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                    rows="4" 
                    placeholder="Document any manual overrides, reasoning, or constraints here..."
                    value={decisionNotes}
                    onChange={e => setDecisionNotes(e.target.value)}
                  ></textarea>
                </div>
                
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => handleDecision('APPROVED')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5"/> Confirm Allocation
                  </button>
                  <button 
                    onClick={() => handleDecision('MODIFIED')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Save className="w-5 h-5"/> Save with Modifications
                  </button>
                  <button 
                    onClick={() => handleDecision('REJECTED')}
                    className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold py-3 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <X className="w-5 h-5"/> Reject Recommendation
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
        
        {/* Navigation Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex justify-between items-center">
          <button 
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${currentStep === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-100'}`}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full ${idx + 1 === currentStep ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            ))}
          </div>

          <button 
            onClick={nextStep}
            disabled={currentStep === totalSteps}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${currentStep === totalSteps ? 'text-gray-400 cursor-not-allowed' : 'text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 shadow-sm'}`}
          >
            Next Step <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
