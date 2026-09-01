import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import { loadLocal, saveLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { ArrowLeft, AlertTriangle, Settings, CheckCircle, XCircle } from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend } from 'recharts';

export default function C1Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('evaluation');
  
  const [inspections, setInspections] = useState([]);
  const [history, setHistory] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  
  const [c1State, setC1State] = useState(() => loadLocal('smartapparel.c1.state', { defaultModel: 'model_yolov8n', overrides: {} }));
  
  // Recommendation Workflow Form State
  const [recForm, setRecForm] = useState({
    factory: 'FAC-001',
    line: 'LINE-03',
    minRecall: 0.85,
    reqFps: 30,
    maxLatency: 40,
    maxMemory: 200,
    minXai: 0.5,
    hardware: 'Edge TPU',
    wAccuracy: 40,
    wSpeed: 30,
    wXai: 20,
    wResource: 10
  });
  
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideModelId, setOverrideModelId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [insps, hists, evals] = await Promise.all([
          loadDemoJson('c1/inspections.json').catch(() => []),
          loadDemoJson('c1/history.json').catch(() => []),
          loadDemoJson('c1/model_evaluations.json').catch(() => [])
        ]);
        setInspections(insps);
        setHistory(hists);
        setEvaluations(evals);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const saveC1State = (newState) => {
    setC1State(newState);
    saveLocal('smartapparel.c1.state', newState);
  };

  if (loading) return <LoadingState message="Loading C1 Analytics..." />;
  if (error) return <ErrorState title="Failed to load analytics" message={error} />;

  // --- Analytics Data Prep ---
  const statusCounts = inspections.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] }));
  const STATUS_COLORS = { 'DEFECTIVE': '#ef4444', 'PASSED': '#22c55e' };

  const rollData = inspections.map(insp => ({
    roll: insp.roll_id,
    events: insp.events
  }));

  // --- Recommendation Logic ---
  const totalWeight = parseInt(recForm.wAccuracy) + parseInt(recForm.wSpeed) + parseInt(recForm.wXai) + parseInt(recForm.wResource);
  const isWeightValid = totalWeight === 100;

  const evaluateModels = () => {
    if (!isWeightValid) return { feasible: [], excluded: [] };
    
    const feasible = [];
    const excluded = [];
    
    evaluations.forEach(model => {
      const reasons = [];
      if (model.critical_recall < recForm.minRecall) reasons.push(`Critical recall (${model.critical_recall}) < ${recForm.minRecall}`);
      if (model.fps < recForm.reqFps) reasons.push(`FPS (${model.fps}) < ${recForm.reqFps}`);
      if (model.median_latency_ms > recForm.maxLatency) reasons.push(`Latency (${model.median_latency_ms}ms) > ${recForm.maxLatency}ms`);
      if (model.memory_mb > recForm.maxMemory) reasons.push(`Memory (${model.memory_mb}MB) > ${recForm.maxMemory}MB`);
      if (model.xai_iou < recForm.minXai) reasons.push(`XAI IoU (${model.xai_iou}) < ${recForm.minXai}`);
      
      if (reasons.length > 0) {
        excluded.push({ ...model, reasons });
      } else {
        // Calculate deterministic score
        const score = (
          (model.critical_recall * parseInt(recForm.wAccuracy)) +
          ((model.fps / 100) * parseInt(recForm.wSpeed)) +
          (model.xai_iou * parseInt(recForm.wXai)) -
          ((model.memory_mb / 1000) * parseInt(recForm.wResource))
        ).toFixed(2);
        
        feasible.push({ ...model, score: parseFloat(score) });
      }
    });
    
    feasible.sort((a, b) => b.score - a.score);
    return { feasible, excluded };
  };

  const { feasible, excluded } = evaluateModels();
  const recommendedModel = feasible.length > 0 ? feasible[0] : null;
  const currentDefaultModel = evaluations.find(m => m.id === c1State.defaultModel) || evaluations[0];

  const handleSetDefault = (modelId) => {
    saveC1State({ ...c1State, defaultModel: modelId });
    alert('Default Inspection Model updated.');
  };

  const handleOverride = (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      alert('Override reason is required.');
      return;
    }
    const newOverrides = { ...c1State.overrides, [new Date().toISOString()]: { modelId: overrideModelId, reason: overrideReason } };
    saveC1State({ ...c1State, defaultModel: overrideModelId, overrides: newOverrides });
    setOverrideReason('');
    alert('Model overridden successfully.');
  };

  const ProvenanceBadge = () => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      <p className="italic">Not a live production recommendation</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c1')} className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <PageHeader title="Fabric Quality Analytics" description="Model evaluation and recorded inspection analytics." />
        </div>
        <ProvenanceBadge />
      </div>

      <div className="flex border-b border-gray-200">
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'evaluation' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('evaluation')}
        >
          Model Evaluation & Recommendation
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'analytics' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('analytics')}
        >
          Inspection Analytics
        </button>
      </div>

      {activeTab === 'evaluation' && (
        <div className="space-y-6">
          <div className="bg-blue-50 text-blue-900 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
            <div>
              <p className="font-bold">Default Inspection Model: {currentDefaultModel?.name}</p>
              <p className="text-xs">Persisted globally for Image and Video Inspection views.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inputs Form */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm col-span-1 space-y-4">
              <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2"><Settings className="w-4 h-4" /> Recommendation Constraints</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Factory</label>
                  <input type="text" value={recForm.factory} onChange={e => setRecForm({...recForm, factory: e.target.value})} className="mt-1 w-full border rounded p-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Line</label>
                  <input type="text" value={recForm.line} onChange={e => setRecForm({...recForm, line: e.target.value})} className="mt-1 w-full border rounded p-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Min Critical Recall</label>
                  <input type="number" step="0.01" value={recForm.minRecall} onChange={e => setRecForm({...recForm, minRecall: parseFloat(e.target.value)})} className="mt-1 w-full border rounded p-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Required FPS</label>
                  <input type="number" value={recForm.reqFps} onChange={e => setRecForm({...recForm, reqFps: parseInt(e.target.value)})} className="mt-1 w-full border rounded p-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Max Latency (ms)</label>
                  <input type="number" value={recForm.maxLatency} onChange={e => setRecForm({...recForm, maxLatency: parseInt(e.target.value)})} className="mt-1 w-full border rounded p-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Max Memory (MB)</label>
                  <input type="number" value={recForm.maxMemory} onChange={e => setRecForm({...recForm, maxMemory: parseInt(e.target.value)})} className="mt-1 w-full border rounded p-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Min Spatial XAI (IoU)</label>
                  <input type="number" step="0.01" value={recForm.minXai} onChange={e => setRecForm({...recForm, minXai: parseFloat(e.target.value)})} className="mt-1 w-full border rounded p-1" />
                </div>
              </div>
              <h4 className="font-semibold text-sm mt-4">Weights (Must equal 100)</h4>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>Acc %<input type="number" value={recForm.wAccuracy} onChange={e => setRecForm({...recForm, wAccuracy: e.target.value})} className="w-full border rounded p-1" /></div>
                <div>Spd %<input type="number" value={recForm.wSpeed} onChange={e => setRecForm({...recForm, wSpeed: e.target.value})} className="w-full border rounded p-1" /></div>
                <div>XAI %<input type="number" value={recForm.wXai} onChange={e => setRecForm({...recForm, wXai: e.target.value})} className="w-full border rounded p-1" /></div>
                <div>Res %<input type="number" value={recForm.wResource} onChange={e => setRecForm({...recForm, wResource: e.target.value})} className="w-full border rounded p-1" /></div>
              </div>
              {!isWeightValid && (
                <div className="text-red-600 text-xs font-bold mt-1">Weights total {totalWeight}%. Must equal exactly 100%.</div>
              )}
            </div>

            {/* Results */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm col-span-2 space-y-4">
              <h3 className="font-bold text-lg border-b pb-2">Evaluation Results</h3>
              {isWeightValid ? (
                <>
                  {/* Recommended Model */}
                  {recommendedModel && (
                    <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                      <h4 className="font-bold text-green-900 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Recommended: {recommendedModel.name}</h4>
                      <p className="text-sm text-green-800 mt-1">Highest feasibility score based on provided constraints.</p>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleSetDefault(recommendedModel.id)} className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded">Set as Default Inspection Model</button>
                        <button onClick={() => navigate(`/c1/inspect-image?model=${recommendedModel.id}`)} className="px-3 py-1 bg-white text-green-700 border border-green-300 text-xs font-bold rounded">Use for Image Insp.</button>
                        <button onClick={() => navigate(`/c1/inspect-video?model=${recommendedModel.id}`)} className="px-3 py-1 bg-white text-green-700 border border-green-300 text-xs font-bold rounded">Use for Video Insp.</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Feasible Models</h4>
                    {feasible.map(m => (
                      <div key={m.id} className="p-3 border rounded text-sm flex justify-between items-center">
                        <div>
                          <p className="font-bold">{m.name} <span className="text-xs font-normal text-gray-500">Score: {m.score}</span></p>
                          <p className="text-xs text-gray-500">mAP: {m.map5095} | Recall: {m.critical_recall} | FPS: {m.fps} | Latency: {m.median_latency_ms}ms | XAI: {m.xai_iou}</p>
                        </div>
                        {currentDefaultModel?.id !== m.id && (
                          <button onClick={() => setOverrideModelId(m.id)} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">Select Override</button>
                        )}
                      </div>
                    ))}
                    {feasible.length === 0 && <p className="text-sm text-gray-500">No models meet all constraints.</p>}

                    <h4 className="font-semibold text-sm mt-4">Excluded Models</h4>
                    {excluded.map(m => (
                      <div key={m.id} className="p-3 bg-red-50 border border-red-100 rounded text-sm">
                        <p className="font-bold text-red-900 flex items-center gap-1"><XCircle className="w-4 h-4" /> {m.name}</p>
                        <ul className="list-disc pl-5 text-xs text-red-800 mt-1">
                          {m.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Override Form */}
                  {overrideModelId && (
                    <form onSubmit={handleOverride} className="mt-4 p-4 bg-gray-50 border rounded-lg">
                      <p className="text-sm font-bold mb-2">Override Default Model to {evaluations.find(e => e.id === overrideModelId)?.name}</p>
                      <input 
                        type="text" 
                        required 
                        value={overrideReason} 
                        onChange={e => setOverrideReason(e.target.value)} 
                        placeholder="Enter override reason..." 
                        className="w-full text-sm border p-2 rounded mb-2" 
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Confirm Override</button>
                        <button type="button" onClick={() => setOverrideModelId('')} className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm">Cancel</button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <div className="p-4 bg-orange-50 text-orange-800 rounded text-sm">Please fix the weight constraints to evaluate models.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
            <h3 className="font-bold text-lg border-b pb-2 mb-4">Inspection Event Distribution</h3>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto mt-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b">
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Record Count</th>
                  </tr>
                </thead>
                <tbody>
                  {statusData.map(item => (
                    <tr key={item.name} className="border-b">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2 font-semibold">{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
            <h3 className="font-bold text-lg border-b pb-2 mb-4">Recorded Events by Roll</h3>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rollData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="roll" tick={{fontSize: 12}} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="events" name="Recorded Events" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto mt-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b">
                    <th className="p-2 font-medium">Roll ID</th>
                    <th className="p-2 font-medium">Recorded Events</th>
                  </tr>
                </thead>
                <tbody>
                  {rollData.map(item => (
                    <tr key={item.roll} className="border-b">
                      <td className="p-2">{item.roll}</td>
                      <td className="p-2 font-semibold">{item.events}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Prototype Limitations Notice */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300 space-y-3">
        <h4 className="font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" /> Prototype Limitations</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>This prototype uses deterministic inspection records.</li>
          <li>No live fabric-inspection model is executed in the browser.</li>
          <li>Any displayed contributor is a precomputed/model-attributed result, not proof of physical causality.</li>
          <li>Physical verification by the quality team is required.</li>
          <li>Production deployment requires real factory data, model validation and workflow approval.</li>
        </ul>
      </div>
    </div>
  );
}
