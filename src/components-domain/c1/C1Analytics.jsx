import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../shared/components/PageHeader';
import { loadLocal, saveLocal } from '../../shared/storage/localStore';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Settings, 
  AlertTriangle, 
  Cpu, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  ImageIcon, 
  Video, 
  FileText,
  Sliders,
  Layers,
  HelpCircle,
  Activity
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';

// Benchmark evidence fixture for candidate detectors
const CANDIDATE_DETECTORS = [
  {
    id: 'model_yolov8n',
    name: 'YOLOv8n',
    map5095: 0.45,
    critical_recall: 0.94,
    fps: 35,
    median_latency_ms: 25,
    p95_latency_ms: 32,
    memory_mb: 180,
    xai_iou: 0.85
  },
  {
    id: 'model_yolov5n',
    name: 'YOLOv5n',
    map5095: 0.42,
    critical_recall: 0.86,
    fps: 45,
    median_latency_ms: 20,
    p95_latency_ms: 28,
    memory_mb: 165,
    xai_iou: 0.65
  },
  {
    id: 'model_ssd_family',
    name: 'SSD-family Detector',
    map5095: 0.36,
    critical_recall: 0.81,
    fps: 50,
    median_latency_ms: 18,
    p95_latency_ms: 25,
    memory_mb: 140,
    xai_iou: 0.56
  }
];

// XAI Evaluation benchmark fixture
const XAI_EVALUATION_DATA = [
  { group: 'Simple Fabric', method: 'Grad-CAM', spatial_iou: 0.88, pointing_acc: '94.2%', consistency: 0.91, gen_time: '12 ms', expert_score: '4.8 / 5.0' },
  { group: 'Simple Fabric', method: 'Grad-CAM++', spatial_iou: 0.92, pointing_acc: '96.5%', consistency: 0.94, gen_time: '16 ms', expert_score: '4.9 / 5.0' },
  { group: 'Moderate Complexity Fabric', method: 'Grad-CAM', spatial_iou: 0.78, pointing_acc: '85.0%', consistency: 0.82, gen_time: '14 ms', expert_score: '4.2 / 5.0' },
  { group: 'Moderate Complexity Fabric', method: 'Grad-CAM++', spatial_iou: 0.84, pointing_acc: '89.2%', consistency: 0.87, gen_time: '18 ms', expert_score: '4.5 / 5.0' },
  { group: 'High Complexity Fabric', method: 'Grad-CAM', spatial_iou: 0.65, pointing_acc: '74.1%', consistency: 0.70, gen_time: '17 ms', expert_score: '3.6 / 5.0' },
  { group: 'High Complexity Fabric', method: 'Grad-CAM++', spatial_iou: 0.73, pointing_acc: '81.8%', consistency: 0.78, gen_time: '22 ms', expert_score: '4.1 / 5.0' }
];

// Line chart dataset for Spatial XAI Quality by Fabric Complexity
const XAI_CHART_DATA = [
  { group: 'Simple Fabric', 'Grad-CAM': 0.88, 'Grad-CAM++': 0.92 },
  { group: 'Moderate Complexity Fabric', 'Grad-CAM': 0.78, 'Grad-CAM++': 0.84 },
  { group: 'High Complexity Fabric', 'Grad-CAM': 0.65, 'Grad-CAM++': 0.73 }
];

const DEFAULT_REC_FORM = {
  factoryId: 'FAC-001',
  lineId: 'LINE-03',
  hardwareProfile: 'Edge GPU',
  minCriticalRecall: 0.85,
  requiredProcessingFps: 30,
  maxLatencyMs: 40,
  maxMemoryMb: 200,
  minSpatialXaiQuality: 0.50,
  wAccuracy: 40,
  wSpeed: 30,
  wXai: 20,
  wResource: 10
};

export default function C1Analytics() {
  const navigate = useNavigate();

  // Active Screen Tab: 'comparison' | 'recommendation' | 'xai'
  const [activeTab, setActiveTab] = useState('comparison');

  // App State Persisted in Local Storage
  const [c1State, setC1State] = useState(() => 
    loadLocal('smartapparel.c1.state', { 
      defaultModel: 'model_yolov8n', 
      defaultModelName: 'YOLOv8n',
      setBy: 'QC Manager',
      lastUpdated: '2026-09-01 09:30',
      overrides: []
    })
  );

  // Recommendation Form State
  const [recForm, setRecForm] = useState(DEFAULT_REC_FORM);
  // Flag indicating if user clicked "Recommend Model"
  const [hasGeneratedRecommendation, setHasGeneratedRecommendation] = useState(false);
  // Confirmation toast message
  const [toastMessage, setToastMessage] = useState(null);

  // Override Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideTargetModelId, setOverrideTargetModelId] = useState('model_yolov5n');
  const [overrideReason, setOverrideReason] = useState('');

  // Collapsible Limitation Card State
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);

  const currentDefaultModelName = useMemo(() => {
    const found = CANDIDATE_DETECTORS.find(m => m.id === c1State.defaultModel);
    return found ? found.name : c1State.defaultModelName || 'YOLOv8n';
  }, [c1State.defaultModel, c1State.defaultModelName]);

  // Priority weight validation
  const totalWeight = useMemo(() => {
    const acc = parseInt(recForm.wAccuracy) || 0;
    const spd = parseInt(recForm.wSpeed) || 0;
    const xai = parseInt(recForm.wXai) || 0;
    const res = parseInt(recForm.wResource) || 0;
    return acc + spd + xai + res;
  }, [recForm.wAccuracy, recForm.wSpeed, recForm.wXai, recForm.wResource]);

  const isWeightValid = totalWeight === 100;

  // Execute recommendation logic upon request
  const recommendationEval = useMemo(() => {
    if (!hasGeneratedRecommendation || !isWeightValid) {
      return { feasible: [], excluded: [], winner: null };
    }

    const feasible = [];
    const excluded = [];

    CANDIDATE_DETECTORS.forEach(model => {
      const failures = [];
      if (model.critical_recall < recForm.minCriticalRecall) {
        failures.push(`Critical Recall ${model.critical_recall} < required minimum ${recForm.minCriticalRecall}`);
      }
      if (model.fps < recForm.requiredProcessingFps) {
        failures.push(`Processing FPS ${model.fps} < required minimum ${recForm.requiredProcessingFps}`);
      }
      if (model.median_latency_ms > recForm.maxLatencyMs) {
        failures.push(`Median Latency ${model.median_latency_ms}ms > maximum ${recForm.maxLatencyMs}ms`);
      }
      if (model.memory_mb > recForm.maxMemoryMb) {
        failures.push(`Memory ${model.memory_mb}MB > maximum ${recForm.maxMemoryMb}MB`);
      }
      if (model.xai_iou < recForm.minSpatialXaiQuality) {
        failures.push(`Spatial XAI IoU ${model.xai_iou} < required minimum ${recForm.minSpatialXaiQuality}`);
      }

      if (failures.length > 0) {
        excluded.push({ ...model, failures });
      } else {
        // Multi-criteria ranking score (0 - 100 scale)
        const wAcc = parseInt(recForm.wAccuracy) / 100;
        const wSpd = parseInt(recForm.wSpeed) / 100;
        const wXai = parseInt(recForm.wXai) / 100;
        const wRes = parseInt(recForm.wResource) / 100;

        const normAcc = model.critical_recall; // 0-1
        const normSpd = Math.min(1.0, model.fps / 60); // 0-1
        const normXai = model.xai_iou; // 0-1
        const normRes = Math.max(0, 1.0 - (model.memory_mb / 300)); // 0-1

        const score = ((normAcc * wAcc + normSpd * wSpd + normXai * wXai + normRes * wRes) * 100).toFixed(1);
        feasible.push({ ...model, score: parseFloat(score) });
      }
    });

    feasible.sort((a, b) => b.score - a.score);
    const winner = feasible.length > 0 ? feasible[0] : null;

    return { feasible, excluded, winner };
  }, [hasGeneratedRecommendation, isWeightValid, recForm]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSetDefaultModel = (modelObj) => {
    const updatedState = {
      ...c1State,
      defaultModel: modelObj.id,
      defaultModelName: modelObj.name,
      setBy: 'QC Manager',
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setC1State(updatedState);
    saveLocal('smartapparel.c1.state', updatedState);
    showToast(`${modelObj.name} has been set as the Default Inspection Model.`);
  };

  const handleConfirmOverride = (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;

    const selectedAlt = CANDIDATE_DETECTORS.find(m => m.id === overrideTargetModelId) || { id: overrideTargetModelId, name: overrideTargetModelId };
    const recWinner = recommendationEval.winner ? recommendationEval.winner.name : 'YOLOv8n';

    const auditEntry = {
      recommendedModel: recWinner,
      selectedAlternativeModel: selectedAlt.name,
      overrideReason: overrideReason.trim(),
      user: 'QC Manager',
      timestamp: new Date().toISOString()
    };

    const updatedState = {
      ...c1State,
      defaultModel: selectedAlt.id,
      defaultModelName: selectedAlt.name,
      setBy: 'QC Manager',
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
      overrides: [...(c1State.overrides || []), auditEntry]
    };

    setC1State(updatedState);
    saveLocal('smartapparel.c1.state', updatedState);
    setIsOverrideModalOpen(false);
    setOverrideReason('');
    showToast(`Model override confirmed. Default inspection model updated to ${selectedAlt.name}.`);
  };

  const ProvenanceBadge = () => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      <p className="italic">Research metrics shown here are illustrative until replaced by actual validated experimental results.</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-3 text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Back Arrow */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/c1')} 
            className="p-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm"
            title="Return to Fabric Quality Overview"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <PageHeader 
              title="Analytical Dashboard" 
              description="Model Comparison & Recommendation" 
            />
            <p className="text-xs text-gray-500 mt-0.5">
              Review evaluated detector evidence and optionally create a model recommendation for a specific operational environment.
            </p>
          </div>
        </div>
        <ProvenanceBadge />
      </div>

      {/* Default Inspection Model Information Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap justify-between items-center text-sm shadow-sm gap-3 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-blue-400 text-base">
            <CheckCircle2 className="w-5 h-5 text-blue-400" /> Default Inspection Model: {currentDefaultModelName}
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300 text-xs">
            Set by: <strong className="text-white">{c1State.setBy || 'QC Manager'}</strong>
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300 text-xs flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Last Updated: {c1State.lastUpdated || '2026-09-01 09:30'}
          </span>
        </div>
        <div className="text-xs text-slate-400 italic">
          "QC-approved model pre-selected for new image and recorded-video inspections."
        </div>
      </div>

      {/* Screen Tabs */}
      <div className="flex border-b border-gray-200 space-x-1 text-sm font-medium">
        <button 
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2.5 rounded-t-lg transition flex items-center gap-2 ${
            activeTab === 'comparison'
              ? 'bg-white text-blue-600 border-t-2 border-x border-gray-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Sliders className="w-4 h-4" /> Model Comparison
        </button>
        <button 
          onClick={() => setActiveTab('recommendation')}
          className={`px-4 py-2.5 rounded-t-lg transition flex items-center gap-2 ${
            activeTab === 'recommendation'
              ? 'bg-white text-blue-600 border-t-2 border-x border-gray-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Recommendation
        </button>
        <button 
          onClick={() => setActiveTab('xai')}
          className={`px-4 py-2.5 rounded-t-lg transition flex items-center gap-2 ${
            activeTab === 'xai'
              ? 'bg-white text-blue-600 border-t-2 border-x border-gray-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Layers className="w-4 h-4" /> XAI Evaluation
        </button>
      </div>

      {/* TAB 1: MODEL COMPARISON */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-800 tracking-wide uppercase">
                  Evaluated Detector Comparison
                </h3>
                <p className="text-xs text-gray-500">
                  Research team's benchmark evidence for candidate fabric defect detectors
                </p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded border border-blue-200">
                3 Candidate Detectors Benchmark
              </span>
            </div>

            {/* Benchmark Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 border-b text-xs font-semibold uppercase tracking-wider">
                    <th className="p-3">Model</th>
                    <th className="p-3">mAP@0.5:0.95</th>
                    <th className="p-3">Critical Recall</th>
                    <th className="p-3">FPS</th>
                    <th className="p-3">Median Latency</th>
                    <th className="p-3">P95 Latency</th>
                    <th className="p-3">Memory</th>
                    <th className="p-3">Spatial XAI IoU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                  {CANDIDATE_DETECTORS.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                        {m.name}
                        {m.id === c1State.defaultModel && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            Default
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-gray-700">{m.map5095}</td>
                      <td className="p-3 font-semibold text-emerald-600">{m.critical_recall}</td>
                      <td className="p-3 text-gray-700">{m.fps} FPS</td>
                      <td className="p-3 text-gray-700">{m.median_latency_ms} ms</td>
                      <td className="p-3 text-gray-700">{m.p95_latency_ms} ms</td>
                      <td className="p-3 text-gray-700">{m.memory_mb} MB</td>
                      <td className="p-3 font-semibold text-indigo-600">{m.xai_iou}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-[11px] text-gray-500 italic text-right">
              * Displayed metrics represent illustrative research benchmarks.
            </div>
          </div>

          {/* Action to create recommendation */}
          <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-6 rounded-xl shadow-md flex flex-wrap justify-between items-center gap-4">
            <div>
              <h4 className="font-bold text-lg">Need a recommendation for a specific inspection environment?</h4>
              <p className="text-xs text-slate-300 mt-1">
                Configure operational hard requirements and priority weights to evaluate constraints and multi-criteria ranking.
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('recommendation')}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-sm transition shadow flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Create Recommendation
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: RECOMMENDATION */}
      {activeTab === 'recommendation' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-gray-800 tracking-wide uppercase">
                  Operational Requirements & Recommendation Setup
                </h3>
                <p className="text-xs text-gray-500">
                  Define hard operational constraints and criteria weights for model selection
                </p>
              </div>
              <span className="text-xs text-slate-500 italic">
                * Hard constraints are evaluated prior to ranking
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Operational Context & Hard Constraints */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2 border-b pb-2">
                  <Settings className="w-4 h-4 text-blue-600" /> Operational Context & Hard Requirements
                </h4>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Factory ID</label>
                    <input 
                      type="text" 
                      value={recForm.factoryId}
                      onChange={e => setRecForm({ ...recForm, factoryId: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Production Line</label>
                    <input 
                      type="text" 
                      value={recForm.lineId}
                      onChange={e => setRecForm({ ...recForm, lineId: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Hardware Profile</label>
                    <select 
                      value={recForm.hardwareProfile}
                      onChange={e => setRecForm({ ...recForm, hardwareProfile: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value="Edge GPU">Edge GPU</option>
                      <option value="Workstation GPU">Workstation GPU</option>
                      <option value="CPU">CPU</option>
                      <option value="Embedded Device">Embedded Device</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Min Critical Recall</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={recForm.minCriticalRecall}
                      onChange={e => setRecForm({ ...recForm, minCriticalRecall: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Required Processing FPS</label>
                    <input 
                      type="number" 
                      value={recForm.requiredProcessingFps}
                      onChange={e => setRecForm({ ...recForm, requiredProcessingFps: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Maximum Latency (ms)</label>
                    <input 
                      type="number" 
                      value={recForm.maxLatencyMs}
                      onChange={e => setRecForm({ ...recForm, maxLatencyMs: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Maximum Memory (MB)</label>
                    <input 
                      type="number" 
                      value={recForm.maxMemoryMb}
                      onChange={e => setRecForm({ ...recForm, maxMemoryMb: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-gray-600 font-semibold mb-1">Minimum Spatial XAI Quality (IoU)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={recForm.minSpatialXaiQuality}
                      onChange={e => setRecForm({ ...recForm, minSpatialXaiQuality: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Priority Weights */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-900 flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-2"><Sliders className="w-4 h-4 text-indigo-600" /> Priority Weights</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isWeightValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    Total Weight: {totalWeight}%
                  </span>
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Accuracy Priority (%)</label>
                    <input 
                      type="number" 
                      value={recForm.wAccuracy}
                      onChange={e => setRecForm({ ...recForm, wAccuracy: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Speed Priority (%)</label>
                    <input 
                      type="number" 
                      value={recForm.wSpeed}
                      onChange={e => setRecForm({ ...recForm, wSpeed: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">XAI Priority (%)</label>
                    <input 
                      type="number" 
                      value={recForm.wXai}
                      onChange={e => setRecForm({ ...recForm, wXai: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Resource Priority (%)</label>
                    <input 
                      type="number" 
                      value={recForm.wResource}
                      onChange={e => setRecForm({ ...recForm, wResource: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {!isWeightValid && (
                  <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-bold flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>Priority weights must total 100%. Current total: {totalWeight}%.</span>
                  </div>
                )}

                <div className="pt-6 flex gap-3">
                  <button 
                    onClick={() => {
                      setRecForm(DEFAULT_REC_FORM);
                      setHasGeneratedRecommendation(false);
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold border border-gray-300 transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Requirements
                  </button>

                  <button 
                    disabled={!isWeightValid}
                    onClick={() => setHasGeneratedRecommendation(true)}
                    className={`flex-1 px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                      isWeightValid ? 'hover:bg-blue-700 shadow' : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" /> Recommend Model
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RECOMMENDATION RESULT SECTION */}
          {hasGeneratedRecommendation && (
            <div className="space-y-6 animate-fade-in">
              {/* Winner Banner */}
              {recommendationEval.winner ? (
                <div className="bg-emerald-950 text-white p-6 rounded-xl border border-emerald-800 shadow-md space-y-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                        RECOMMENDATION RESULT
                      </span>
                      <h3 className="text-xl font-bold mt-1 text-white flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                        Recommended Model Among Evaluated Candidates: {recommendationEval.winner.name}
                      </h3>
                    </div>
                    <span className="bg-emerald-800 text-emerald-100 text-xs font-bold px-3 py-1 rounded-full border border-emerald-700">
                      Score: {recommendationEval.winner.score} / 100
                    </span>
                  </div>

                  <p className="text-xs text-emerald-200 bg-emerald-900/60 p-3 rounded-lg border border-emerald-800/80 leading-relaxed">
                    <strong>Reason:</strong> Meets all selected critical-recall, throughput, latency, memory and XAI requirements and achieves the highest multi-criteria score among feasible candidate models for <strong>{recForm.factoryId} / {recForm.lineId}</strong> ({recForm.hardwareProfile}).
                  </p>

                  {/* Feasibility Comparison Table */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                      Feasibility Verification Details
                    </h4>
                    <div className="overflow-x-auto bg-slate-900 rounded-lg border border-slate-800 text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="p-2.5">Metric</th>
                            <th className="p-2.5">Model Value ({recommendationEval.winner.name})</th>
                            <th className="p-2.5">Requirement</th>
                            <th className="p-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          <tr>
                            <td className="p-2.5">Critical Recall</td>
                            <td className="p-2.5 font-bold text-emerald-400">{recommendationEval.winner.critical_recall}</td>
                            <td className="p-2.5 text-slate-400">&ge; {recForm.minCriticalRecall}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-400">PASS</td>
                          </tr>
                          <tr>
                            <td className="p-2.5">Processing FPS</td>
                            <td className="p-2.5 font-bold text-emerald-400">{recommendationEval.winner.fps} FPS</td>
                            <td className="p-2.5 text-slate-400">&ge; {recForm.requiredProcessingFps} FPS</td>
                            <td className="p-2.5 text-right font-bold text-emerald-400">PASS</td>
                          </tr>
                          <tr>
                            <td className="p-2.5">Median Latency</td>
                            <td className="p-2.5 font-bold text-emerald-400">{recommendationEval.winner.median_latency_ms} ms</td>
                            <td className="p-2.5 text-slate-400">&le; {recForm.maxLatencyMs} ms</td>
                            <td className="p-2.5 text-right font-bold text-emerald-400">PASS</td>
                          </tr>
                          <tr>
                            <td className="p-2.5">Memory Usage</td>
                            <td className="p-2.5 font-bold text-emerald-400">{recommendationEval.winner.memory_mb} MB</td>
                            <td className="p-2.5 text-slate-400">&le; {recForm.maxMemoryMb} MB</td>
                            <td className="p-2.5 text-right font-bold text-emerald-400">PASS</td>
                          </tr>
                          <tr>
                            <td className="p-2.5">Spatial XAI Quality (IoU)</td>
                            <td className="p-2.5 font-bold text-emerald-400">{recommendationEval.winner.xai_iou}</td>
                            <td className="p-2.5 text-slate-400">&ge; {recForm.minSpatialXaiQuality}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-400">PASS</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions after recommendation */}
                  <div className="pt-3 flex flex-wrap gap-2.5">
                    <button 
                      onClick={() => handleSetDefaultModel(recommendationEval.winner)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" /> Set as Default Inspection Model
                    </button>

                    <button 
                      onClick={() => navigate(`/c1/inspect-image?model=${recommendationEval.winner.id}`)}
                      className="px-3 py-2 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-lg text-xs transition flex items-center gap-1.5"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Use for Image Inspection
                    </button>

                    <button 
                      onClick={() => navigate(`/c1/inspect-video?model=${recommendationEval.winner.id}`)}
                      className="px-3 py-2 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-lg text-xs transition flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5 text-purple-600" /> Use for Video Inspection
                    </button>

                    <button 
                      onClick={() => setIsOverrideModalOpen(true)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-lg text-xs border border-amber-500/40 transition flex items-center gap-1.5"
                    >
                      Select Another Model / Override
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 text-red-900 p-6 rounded-xl">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" /> No Feasible Candidate Models
                  </h3>
                  <p className="text-xs text-red-800 mt-1">
                    None of the evaluated candidate detectors met all of your hard operational constraints. Relax constraints to view feasible candidates.
                  </p>
                </div>
              )}

              {/* Feasible & Excluded Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Feasible Models */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-sm text-gray-800 border-b pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Feasible Models</span>
                    <span className="text-xs text-gray-500 font-normal">Ranked by multi-criteria score</span>
                  </h4>

                  <div className="space-y-2">
                    {recommendationEval.feasible.map((m, idx) => (
                      <div key={m.id} className="p-3 border border-gray-200 rounded-lg flex items-center justify-between text-xs hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            <span>#{idx + 1} {m.name}</span>
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                              FEASIBLE
                            </span>
                          </div>
                          <p className="text-gray-500 mt-0.5">
                            Recall: {m.critical_recall} | FPS: {m.fps} | Latency: {m.median_latency_ms}ms | XAI: {m.xai_iou}
                          </p>
                        </div>
                        <span className="font-bold text-sm text-slate-800 bg-gray-100 px-2 py-1 rounded border">
                          {m.score}
                        </span>
                      </div>
                    ))}
                    {recommendationEval.feasible.length === 0 && (
                      <p className="text-xs text-gray-500 italic p-4 text-center">No feasible models.</p>
                    )}
                  </div>
                </div>

                {/* Excluded Models */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-sm text-gray-800 border-b pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-600" /> Excluded Models</span>
                    <span className="text-xs text-gray-500 font-normal">Failed hard constraints</span>
                  </h4>

                  <div className="space-y-2">
                    {recommendationEval.excluded.map(m => (
                      <div key={m.id} className="p-3 bg-red-50/50 border border-red-200 rounded-lg text-xs space-y-1">
                        <div className="font-bold text-red-900 flex items-center justify-between">
                          <span>{m.name}</span>
                          <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            EXCLUDED
                          </span>
                        </div>
                        <ul className="list-disc pl-4 text-red-700 text-[11px] space-y-0.5">
                          {m.failures.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {recommendationEval.excluded.length === 0 && (
                      <p className="text-xs text-gray-500 italic p-4 text-center">No models were excluded by hard constraints.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: XAI EVALUATION */}
      {activeTab === 'xai' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            {/* Title & Illustrative Label */}
            <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-800 tracking-wide uppercase">
                  XAI Evaluation Benchmark
                </h3>
                <p className="text-xs text-gray-500">
                  XAI Evaluation measures spatial explanation quality and consistency across fabric complexity groups.
                </p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded border border-indigo-200">
                Illustrative / Precomputed Research Values
              </span>
            </div>

            {/* Line Chart: Spatial XAI Quality by Fabric Complexity */}
            <div className="bg-slate-50 p-5 rounded-xl border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" /> Spatial XAI Quality by Fabric Complexity
                </h4>
                <span className="text-xs text-gray-500 font-medium">Y-axis: Spatial IoU</span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={XAI_CHART_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="group" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0.5, 1.0]} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Grad-CAM" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Grad-CAM++" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Decision Support Summary */}
            <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-xl space-y-3">
              <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" /> Decision Support Summary
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-sm space-y-1">
                  <span className="text-gray-500 font-semibold block text-[11px]">Best Spatial Explanation Method</span>
                  <span className="font-bold text-blue-700 text-sm block">Grad-CAM++</span>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Based on the current illustrative evaluation results, Grad-CAM++ shows higher spatial localization values across the three complexity groups.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-sm space-y-1">
                  <span className="text-gray-500 font-semibold block text-[11px]">Complexity Impact</span>
                  <span className="font-bold text-amber-700 text-sm block">Quality Decreases</span>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    XAI explanation quality decreases as fabric complexity increases.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-sm space-y-1">
                  <span className="text-gray-500 font-semibold block text-[11px]">High Complexity Comparison</span>
                  <div className="font-bold text-gray-800 text-xs space-y-1 pt-1">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Grad-CAM:</span>
                      <span className="text-blue-600">0.65 Spatial IoU</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-gray-600">Grad-CAM++:</span>
                      <span className="text-purple-600">0.73 Spatial IoU</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-sm space-y-1">
                  <span className="text-gray-500 font-semibold block text-[11px]">Trade-off</span>
                  <span className="font-bold text-indigo-700 text-xs block">Localization vs Time</span>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Grad-CAM++ provides better spatial localization, but it takes slightly more time to generate the explanation.
                  </p>
                </div>
              </div>
            </div>

            {/* How to Use This Evidence Box */}
            <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex items-start gap-3 text-xs shadow-sm">
              <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-blue-300 block text-xs font-bold uppercase tracking-wider mb-1">How to Use This Evidence</strong>
                <p className="text-slate-300 leading-relaxed text-xs">
                  "Use these research-level results to understand how explanation quality changes across fabric complexity levels and to support XAI quality and model-selection decisions. Runtime heatmaps still require human interpretation."
                </p>
              </div>
            </div>

            {/* Detailed XAI Evaluation Table */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Detailed XAI Evaluation Benchmark Table
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 border-b text-xs font-semibold uppercase tracking-wider">
                      <th className="p-3">Complexity Group</th>
                      <th className="p-3">XAI Method</th>
                      <th className="p-3">Spatial IoU</th>
                      <th className="p-3">Pointing Accuracy</th>
                      <th className="p-3">Consistency</th>
                      <th className="p-3">Generation Time</th>
                      <th className="p-3">Expert Agreement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs">
                    {XAI_EVALUATION_DATA.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-gray-900">{row.group}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            row.method === 'Grad-CAM++' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {row.method}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-blue-600">{row.spatial_iou}</td>
                        <td className="p-3 text-gray-700">{row.pointing_acc}</td>
                        <td className="p-3 text-gray-700">{row.consistency}</td>
                        <td className="p-3 text-gray-600">{row.gen_time}</td>
                        <td className="p-3 font-semibold text-emerald-600">{row.expert_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERRIDE MODAL */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-gray-200 animate-scale-in">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Select Another Model / Override
              </h3>
              <button onClick={() => setIsOverrideModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmOverride} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Recommended Model</label>
                <div className="p-2.5 bg-gray-100 rounded font-bold text-gray-800 border">
                  {recommendationEval.winner ? recommendationEval.winner.name : 'YOLOv8n'}
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Alternative Evaluated Model *</label>
                <select 
                  value={overrideTargetModelId}
                  onChange={e => setOverrideTargetModelId(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {CANDIDATE_DETECTORS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Override Reason (Required) *</label>
                <textarea 
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="Provide audit justification for selecting an alternative model over the recommendation..."
                  className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!overrideReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded disabled:opacity-50 transition"
                >
                  Confirm Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prototype Limitation Notice */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 text-slate-300 overflow-hidden text-xs">
        <button 
          onClick={() => setIsNoticeOpen(!isNoticeOpen)}
          className="w-full p-4 text-left font-bold text-white flex items-center justify-between hover:bg-slate-750 transition"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" /> Prototype / Illustrative Data Notice
          </span>
          <span className="text-slate-400 font-normal text-[11px]">
            {isNoticeOpen ? 'Hide Notice ▲' : 'Show Notice ▼'}
          </span>
        </button>

        {isNoticeOpen && (
          <div className="px-6 pb-5 space-y-2 border-t border-slate-700/60 pt-3">
            <ul className="list-disc pl-5 space-y-1 text-slate-300 text-xs">
              <li>Research metrics shown here are illustrative until replaced by actual validated experimental results.</li>
              <li>No live fabric-inspection model is executed in the browser at this proposal stage.</li>
              <li>Displayed model/XAI outputs must not be interpreted as proof of physical causality.</li>
              <li>Human quality-team review is required.</li>
              <li>Final research implementation will replace demonstration values with validated experimental outputs.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
