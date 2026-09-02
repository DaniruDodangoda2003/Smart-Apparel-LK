import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadLocal, saveLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import { 
  ArrowLeft, 
  Upload, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Flag, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  Image as ImageIcon, 
  Eye, 
  Layers, 
  Check, 
  X,
  HelpCircle,
  UserCheck
} from 'lucide-react';

const CANDIDATE_MODELS = [
  { id: 'model_yolov8n', name: 'YOLOv8n' },
  { id: 'model_yolov5n', name: 'YOLOv5n' },
  { id: 'model_ssd_family', name: 'SSD-family Detector' }
];

const MASTER_FACTORIES = [
  { id: 'FAC-001', name: 'FAC-001 (Colombo Main)' },
  { id: 'FAC-002', name: 'FAC-002 (Kandy Plant)' },
  { id: 'FAC-003', name: 'FAC-003 (Galle Mill)' }
];

const MASTER_LINES = {
  'FAC-001': ['LINE-01', 'LINE-02', 'LINE-03', 'LINE-04'],
  'FAC-002': ['LINE-05', 'LINE-06'],
  'FAC-003': ['LINE-07', 'LINE-08']
};

const MASTER_MACHINES = {
  'LINE-01': ['MC-010', 'MC-011'],
  'LINE-02': ['MC-012', 'MC-013'],
  'LINE-03': ['MC-014', 'MC-015', 'MC-016'],
  'LINE-04': ['MC-017', 'MC-018'],
  'LINE-05': ['MC-020', 'MC-021'],
  'LINE-06': ['MC-022', 'MC-023'],
  'LINE-07': ['MC-030', 'MC-031'],
  'LINE-08': ['MC-032', 'MC-033']
};

const MASTER_ROLLS = ['ROLL-2026-104', 'ROLL-2026-105', 'ROLL-2026-106', 'ROLL-2026-107'];
const MASTER_BATCHES = ['PB-4021', 'PB-4022', 'PB-4023', 'PB-4024'];
const MASTER_SHIFTS = ['SHIFT-A', 'SHIFT-B', 'SHIFT-C'];
const MASTER_POINTS = ['FABRIC_QC', 'CUTTING_ROOM_INBOUND', 'FINISHING_OUTBOUND'];
const MASTER_OPERATORS = ['OP-ANON-021', 'OP-ANON-022', 'OP-ANON-035', 'OP-ANON-044'];

const PROTOTYPE_RESULT = {
  defectClass: 'Stain',
  confidence: 91,
  hasDefect: true,
  boundingBox: { x: 120, y: 90, width: 140, height: 110, label: 'Stain' },
  heatmapUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80'
};

export default function C1ImageInspection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // App State Persisted in Local Storage
  const [c1State] = useState(() => 
    loadLocal('smartapparel.c1.state', { defaultModel: 'model_yolov8n' })
  );

  // Pre-selected model calculation: URL parameter > Saved Default Model > Fallback
  const passedModelId = searchParams.get('model');
  const initialModelId = passedModelId || c1State.defaultModel || 'model_yolov8n';

  const [selectedModelId, setSelectedModelId] = useState(initialModelId);

  // Inspection Context State
  const [contextData, setContextData] = useState({
    factoryId: 'FAC-001',
    lineId: 'LINE-03',
    machineId: 'MC-014',
    rollId: 'ROLL-2026-104',
    batchId: 'PB-4021',
    shift: 'SHIFT-A',
    inspectionPoint: 'FABRIC_QC',
    operatorRef: 'OP-ANON-021'
  });

  const [additionalContext, setAdditionalContext] = useState({
    orderId: 'ORD-5542',
    styleId: 'STL-8821',
    yarnBatchId: 'YRN-771',
    dyeBatchId: 'DYE-409',
    supplierId: 'SUP-GLOBAL'
  });

  const [showAdditionalContext, setShowAdditionalContext] = useState(false);

  // Upload State
  const [uploadedImageFile, setUploadedImageFile] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('fabric_sample_01.jpg');
  const [previewUrl, setPreviewUrl] = useState('https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=800&q=80');
  
  // Inspection Execution State
  const [isInspected, setIsInspected] = useState(false);
  const [inspectionTimestamp, setInspectionTimestamp] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Human Review State (Unselected by default as specified)
  const [humanReview, setHumanReview] = useState({
    classification: null, // null | 'yes' | 'needs_review'
    boundingBox: null,    // null | 'acceptable' | 'needs_review'
    xaiFocus: null,       // null | 'relevant' | 'needs_review'
    note: ''
  });

  const isReviewComplete = 
    Boolean(humanReview.classification) &&
    Boolean(humanReview.boundingBox) &&
    Boolean(humanReview.xaiFocus);

  const hasNeedsReview = 
    humanReview.classification === 'needs_review' ||
    humanReview.boundingBox === 'needs_review' ||
    humanReview.xaiFocus === 'needs_review';

  const isReviewAccepted = 
    isReviewComplete &&
    humanReview.classification === 'yes' &&
    humanReview.boundingBox === 'acceptable' &&
    humanReview.xaiFocus === 'relevant';

  // XAI Explanation Method State
  const [xaiMethod, setXaiMethod] = useState('Grad-CAM');

  // Flag Incorrect Modal State
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagFeedback, setFlagFeedback] = useState({
    incorrectClass: false,
    incorrectBox: false,
    incorrectExplanation: false,
    note: ''
  });

  // Collapsible Limitation Card State
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);

  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedImageFile(file);
      setUploadedFileName(file.name);
      setPreviewUrl(url);
      setIsInspected(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImageFile(null);
    setUploadedFileName('');
    setPreviewUrl(null);
    setIsInspected(false);
  };

  const handleFactoryChange = (newFac) => {
    const availableLines = MASTER_LINES[newFac] || ['LINE-01'];
    const newBaseline = availableLines[0];
    const availableMachines = MASTER_MACHINES[newBaseline] || ['MC-010'];
    setContextData({
      ...contextData,
      factoryId: newFac,
      lineId: newBaseline,
      machineId: availableMachines[0]
    });
  };

  const handleLineChange = (newLine) => {
    const availableMachines = MASTER_MACHINES[newLine] || ['MC-010'];
    setContextData({
      ...contextData,
      lineId: newLine,
      machineId: availableMachines[0]
    });
  };

  const isContextValid = 
    Boolean(contextData.factoryId) &&
    Boolean(contextData.lineId) &&
    Boolean(contextData.machineId) &&
    Boolean(contextData.rollId) &&
    Boolean(contextData.batchId) &&
    Boolean(contextData.shift) &&
    Boolean(contextData.inspectionPoint) &&
    Boolean(contextData.operatorRef);

  const handleRunInspection = () => {
    if (!isContextValid) {
      showToast("Please complete the required inspection context before running the inspection.");
      return;
    }
    if (!previewUrl) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setInspectionTimestamp(now);
    setIsInspected(true);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenFlagModal = () => {
    setFlagFeedback({
      incorrectClass: humanReview.classification === 'needs_review',
      incorrectBox: humanReview.boundingBox === 'needs_review',
      incorrectExplanation: humanReview.xaiFocus === 'needs_review',
      note: humanReview.note || flagFeedback.note
    });
    setIsFlagModalOpen(true);
  };

  const handleSaveInspection = () => {
    const activeModelObj = CANDIDATE_MODELS.find(m => m.id === selectedModelId) || { name: selectedModelId };
    
    const record = {
      inspection_id: `INSP-LOCAL-${Date.now().toString().slice(-4)}`,
      timestamp: inspectionTimestamp || new Date().toISOString(),
      context: { ...contextData, ...additionalContext },
      model: activeModelObj.name,
      uploaded_image: uploadedFileName || 'fabric_sample_01.jpg',
      defect_class: PROTOTYPE_RESULT.hasDefect ? PROTOTYPE_RESULT.defectClass : 'None',
      confidence: PROTOTYPE_RESULT.hasDefect ? PROTOTYPE_RESULT.confidence : 0,
      status: PROTOTYPE_RESULT.hasDefect ? 'DEFECTIVE' : 'PASSED',
      human_review: { ...humanReview, verified: isReviewAccepted },
      flagged: hasNeedsReview || flagFeedback.incorrectClass || flagFeedback.incorrectBox || flagFeedback.incorrectExplanation,
      feedback_note: humanReview.note || flagFeedback.note
    };

    const existingSaved = loadLocal('smartapparel.c1.saved_inspections', []);
    saveLocal('smartapparel.c1.saved_inspections', [record, ...existingSaved]);
    showToast('Inspection record saved with Human Review status. Available in Inspection History & Reports (Screen 6).');
  };

  const handleNavigateToScreen5 = () => {
    const activeModelObj = CANDIDATE_MODELS.find(m => m.id === selectedModelId) || { name: selectedModelId };
    const sessionData = {
      event_id: 'EVT-019',
      inspection_id: 'INS-0013',
      source_type: 'IMAGE',
      context: contextData,
      additional_context: additionalContext,
      model: activeModelObj.name,
      uploaded_image: uploadedFileName || 'fabric_sample_01.jpg',
      preview_url: previewUrl,
      defect_class: PROTOTYPE_RESULT.hasDefect ? PROTOTYPE_RESULT.defectClass : 'None',
      confidence: PROTOTYPE_RESULT.hasDefect ? PROTOTYPE_RESULT.confidence : 0,
      timestamp: inspectionTimestamp || new Date().toISOString().replace('T', ' ').substring(0, 16),
      human_review: humanReview,
      is_review_complete: isReviewComplete,
      is_review_accepted: isReviewAccepted,
      has_needs_review: hasNeedsReview,
      xai_method: xaiMethod
    };
    saveLocal('smartapparel.c1.active_inspection_session', sessionData);
    navigate('/c1/event/EVT-019');
  };

  const handleSaveFeedback = (e) => {
    e.preventDefault();
    setIsFlagModalOpen(false);
    showToast('Feedback submitted successfully and attached to inspection audit record.');
  };

  const selectedModelName = CANDIDATE_MODELS.find(m => m.id === selectedModelId)?.name || selectedModelId;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-3 text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
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
              title="Manual Image Inspection" 
              description="Upload a fabric image, select an evaluated model and review detection and XAI evidence." 
            />
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
          <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
          </div>
          <p className="italic">Current detection boxes, confidence values and XAI outputs use precomputed demonstration data.</p>
        </div>
      </div>

      {/* SECTION 1: INSPECTION CONTEXT */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Inspection Context
            </h3>
            <p className="text-xs text-gray-500">
              Select or enter operational parameters to connect inspection results to factory units and rolls.
            </p>
          </div>
          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded border border-gray-200">
            Master Data Selectors
          </span>
        </div>

        {/* 8 Required Inspection Context Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Factory */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Factory <span className="text-red-500">*</span>
            </label>
            <select
              value={contextData.factoryId}
              onChange={(e) => handleFactoryChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium text-xs"
            >
              {MASTER_FACTORIES.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Production Line (Cascading) */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Production Line <span className="text-red-500">*</span>
            </label>
            <select
              value={contextData.lineId}
              onChange={(e) => handleLineChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium text-xs"
            >
              {(MASTER_LINES[contextData.factoryId] || []).map(line => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>
          </div>

          {/* 3. Machine (Cascading) */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Machine <span className="text-red-500">*</span>
            </label>
            <select
              value={contextData.machineId}
              onChange={(e) => setContextData({ ...contextData, machineId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium text-xs"
            >
              {(MASTER_MACHINES[contextData.lineId] || ['MC-014']).map(mc => (
                <option key={mc} value={mc}>{mc}</option>
              ))}
            </select>
          </div>

          {/* 4. Roll ID */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Roll ID <span className="text-red-500">*</span>
            </label>
            <select
              value={contextData.rollId}
              onChange={(e) => setContextData({ ...contextData, rollId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium text-xs"
            >
              {MASTER_ROLLS.map(roll => (
                <option key={roll} value={roll}>{roll}</option>
              ))}
            </select>
          </div>

          {/* 5. Production Batch ID */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Production Batch ID <span className="text-red-500">*</span>
            </label>
            <select
              value={contextData.batchId}
              onChange={(e) => setContextData({ ...contextData, batchId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium text-xs"
            >
              {MASTER_BATCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* 6. Shift */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Shift <span className="text-red-500">*</span>
            </label>
            <select
              value={contextData.shift}
              onChange={(e) => setContextData({ ...contextData, shift: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium text-xs"
            >
              {MASTER_SHIFTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 7. Inspection Point */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Inspection Point <span className="text-red-500">*</span>
            </label>
            <select
              value={contextData.inspectionPoint}
              onChange={(e) => setContextData({ ...contextData, inspectionPoint: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium text-xs"
            >
              {MASTER_POINTS.map(pt => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          </div>

          {/* 8. Operator Reference */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Operator Reference <span className="text-red-500">*</span>
            </label>
            <select
              value={contextData.operatorRef}
              onChange={(e) => setContextData({ ...contextData, operatorRef: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium text-xs"
            >
              {MASTER_OPERATORS.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Expandable Additional Context Section */}
        <div className="pt-2">
          <button 
            type="button"
            onClick={() => setShowAdditionalContext(!showAdditionalContext)}
            className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
          >
            {showAdditionalContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showAdditionalContext ? 'Hide Additional Context' : 'Show Additional Context (Order, Style, Batch & Supplier details)'}
          </button>

          {showAdditionalContext && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs mt-3 pt-3 border-t border-gray-200 animate-fade-in">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Order ID</label>
                <input 
                  type="text" 
                  value={additionalContext.orderId}
                  onChange={(e) => setAdditionalContext({ ...additionalContext, orderId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Style ID</label>
                <input 
                  type="text" 
                  value={additionalContext.styleId}
                  onChange={(e) => setAdditionalContext({ ...additionalContext, styleId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Yarn Batch ID</label>
                <input 
                  type="text" 
                  value={additionalContext.yarnBatchId}
                  onChange={(e) => setAdditionalContext({ ...additionalContext, yarnBatchId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Dye Batch ID</label>
                <input 
                  type="text" 
                  value={additionalContext.dyeBatchId}
                  onChange={(e) => setAdditionalContext({ ...additionalContext, dyeBatchId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Supplier ID</label>
                <input 
                  type="text" 
                  value={additionalContext.supplierId}
                  onChange={(e) => setAdditionalContext({ ...additionalContext, supplierId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: SETUP & FABRIC IMAGE UPLOAD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Control Panel */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-5">
          {/* Model Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Inspection Model <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => { setSelectedModelId(e.target.value); setIsInspected(false); }}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CANDIDATE_MODELS.map(m => {
                const isDefault = m.id === c1State.defaultModel;
                const isRecommended = m.id === passedModelId;
                let badge = '';
                if (isRecommended) badge = ' (Recommended)';
                else if (isDefault) badge = ' (Default)';

                return (
                  <option key={m.id} value={m.id}>
                    {m.name}{badge}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              Select an evaluated candidate detector model for manual inference.
            </p>
          </div>

          {/* Run Inspection Trigger */}
          <div className="pt-3 border-t border-gray-200 space-y-2">
            <button 
              disabled={!previewUrl || !isContextValid || !selectedModelId}
              onClick={handleRunInspection}
              className={`w-full py-3 rounded-lg font-bold text-xs shadow flex justify-center items-center gap-2 transition ${
                previewUrl && isContextValid && selectedModelId
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Search className="w-4 h-4" /> Run Inspection
            </button>
            {(!previewUrl || !isContextValid || !selectedModelId) && (
              <p className="text-[10px] text-amber-600 text-center font-medium">
                {!isContextValid 
                  ? 'Complete required inspection context parameters' 
                  : !previewUrl 
                    ? 'Upload a fabric image to enable inspection' 
                    : 'Select an inspection model'}
              </p>
            )}
          </div>
        </div>

        {/* Right Upload Panel */}
        <div className="md:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Upload Fabric Image
            </h3>
            <span className="text-[11px] text-gray-500">Supported formats: JPG, JPEG, PNG</span>
          </div>

          <input 
            type="file" 
            accept="image/jpeg,image/png,image/jpg" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
          />

          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50/50 hover:border-blue-300 transition space-y-3"
            >
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-sm font-bold text-gray-700">Click to Choose Image File</p>
                <p className="text-xs text-gray-500 mt-0.5">Select a high-resolution fabric scan image from your local device</p>
              </div>
              <button 
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Choose Image File
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-semibold">Uploaded Image:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {uploadedFileName || 'fabric_sample_01.jpg'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 rounded text-[11px] font-medium text-gray-700"
                  >
                    Replace Image
                  </button>
                  <button 
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-2.5 py-1 bg-white border border-red-200 hover:bg-red-50 rounded text-[11px] font-medium text-red-600"
                  >
                    Remove Image
                  </button>
                </div>
              </div>

              {/* Initial Image Preview before inspection execution */}
              {!isInspected && (
                <div className="bg-slate-900 rounded-xl overflow-hidden min-h-[280px] max-h-[360px] flex items-center justify-center relative shadow-inner">
                  <img 
                    src={previewUrl} 
                    alt="Fabric Input Preview" 
                    className="max-h-[340px] max-w-full object-contain" 
                  />
                  <div className="absolute bottom-3 left-3 bg-slate-900/85 text-white px-3 py-1.5 rounded text-xs backdrop-blur-sm border border-slate-700 font-medium">
                    Image ready for inference. Click "Run Inspection" to evaluate fabric surface.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: DETECTION RESULT & EVIDENCE VISUALIZATION */}
      {isInspected && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Card */}
          <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-800 space-y-3">
            <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                  INFERENCE RESULTS SUMMARY
                </span>
                <h3 className="text-lg font-bold mt-0.5 text-white flex items-center gap-2">
                  Detection Result
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Timestamp: {inspectionTimestamp}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
              <div>
                <span className="text-slate-400 block text-[11px]">Detected Defect</span>
                <span className={`text-base font-bold mt-0.5 block ${PROTOTYPE_RESULT.hasDefect ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {PROTOTYPE_RESULT.hasDefect ? PROTOTYPE_RESULT.defectClass : 'No known defect detected'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Confidence Score</span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {PROTOTYPE_RESULT.hasDefect ? `${PROTOTYPE_RESULT.confidence}%` : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Selected Inspection Model</span>
                <span className="text-base font-bold text-blue-400 mt-0.5 block">
                  {selectedModelName}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Inspection Time</span>
                <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
                  {inspectionTimestamp}
                </span>
              </div>
            </div>
          </div>

          {/* Two-Column Visual Evidence Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Detection View */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" /> Detection View
                </h4>
                <span className="text-xs text-gray-500 font-medium">Original Image + Bounding Box</span>
              </div>

              <div className="bg-slate-900 rounded-lg overflow-hidden min-h-[320px] max-h-[380px] flex items-center justify-center relative shadow-inner">
                <img 
                  src={previewUrl} 
                  alt="Detection View" 
                  className="max-h-[360px] max-w-full object-contain" 
                />

                {/* Bounding Box Overlay */}
                {PROTOTYPE_RESULT.hasDefect && PROTOTYPE_RESULT.boundingBox && (
                  <div 
                    className="absolute border-2 border-red-500 bg-red-500/20 rounded shadow-lg"
                    style={{
                      left: '30%',
                      top: '25%',
                      width: '40%',
                      height: '45%'
                    }}
                  >
                    <span className="absolute -top-7 left-0 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                      {PROTOTYPE_RESULT.defectClass} ({PROTOTYPE_RESULT.confidence}%)
                    </span>
                  </div>
                )}

                {!PROTOTYPE_RESULT.hasDefect && (
                  <div className="absolute top-4 left-4 bg-emerald-900/90 text-emerald-200 border border-emerald-700 px-3 py-1.5 rounded text-xs font-bold shadow">
                    ✓ No known defect detected
                  </div>
                )}

                <div className="absolute bottom-3 left-3 bg-slate-900/80 text-blue-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-semibold">
                  Detected defect area
                </div>
              </div>

              <p className="text-[11px] text-gray-500 italic">
                Left panel displays detected object bounds and classification thresholding.
              </p>
            </div>

            {/* Right Column: Model Focus (XAI Heatmap Overlay on Same Image) */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-3">
              <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" /> Model Focus – {xaiMethod}
                </h4>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600">XAI Method:</label>
                  <select 
                    value={xaiMethod} 
                    onChange={(e) => setXaiMethod(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs font-bold text-purple-700 bg-purple-50 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="Grad-CAM">Grad-CAM</option>
                    <option value="Grad-CAM++">Grad-CAM++</option>
                  </select>
                </div>
              </div>

              {/* Same Fabric Image + XAI Heatmap Thermal Overlay */}
              <div className="bg-slate-900 rounded-lg overflow-hidden min-h-[320px] max-h-[380px] flex items-center justify-center relative shadow-inner">
                {/* Same uploaded fabric image */}
                <img 
                  src={previewUrl} 
                  alt="Model Focus Base Image" 
                  className="max-h-[360px] max-w-full object-contain" 
                />

                {/* Heatmap Thermal Gradient Overlay Centered on Defect Area */}
                {PROTOTYPE_RESULT.hasDefect && (
                  <div 
                    className="absolute pointer-events-none rounded-full transition-all duration-300"
                    style={{
                      left: '30%',
                      top: '25%',
                      width: '40%',
                      height: '45%',
                      background: xaiMethod === 'Grad-CAM++'
                        ? 'radial-gradient(circle at 50% 48%, rgba(220, 38, 38, 0.92) 0%, rgba(234, 88, 12, 0.82) 22%, rgba(202, 138, 4, 0.65) 45%, rgba(99, 102, 241, 0.4) 68%, transparent 85%)'
                        : 'radial-gradient(circle at 50% 48%, rgba(239, 68, 68, 0.85) 0%, rgba(249, 115, 22, 0.75) 30%, rgba(234, 179, 8, 0.55) 55%, rgba(59, 130, 246, 0.35) 75%, transparent 92%)',
                      filter: 'blur(3px)',
                      mixBlendMode: 'screen'
                    }}
                  />
                )}

                <div className="absolute top-3 right-3 bg-purple-950/90 text-purple-200 text-[10px] font-bold px-2 py-1 rounded border border-purple-800 shadow">
                  {xaiMethod} Explanation Overlay
                </div>

                <div className="absolute bottom-3 left-3 bg-slate-900/80 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-semibold">
                  Model attention area
                </div>
              </div>

              {/* Warning under XAI Heatmap as specified */}
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>"The heatmap indicates model focus; it does not prove the physical cause of the defect."</span>
              </div>
            </div>
          </div>

          {/* SECTION: HUMAN REVIEW */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" /> Human Review
                </h4>
                <p className="text-xs text-gray-500">
                  Quality Inspector or QC Manager must review the AI result before saving or continuing.
                </p>
              </div>

              {!isReviewComplete ? (
                <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full border border-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-500" /> Human Review Pending (Answer 3 questions)
                </span>
              ) : isReviewAccepted ? (
                <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Human Review: Accepted
                </span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Human Review: Needs Review
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Item 1: Detection Classification */}
              <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-2">
                <span className="text-gray-700 font-semibold block">
                  1. Is the detected defect class reasonable? <span className="text-red-500">*</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHumanReview({ ...humanReview, classification: 'yes' })}
                    className={`flex-1 py-1.5 px-3 rounded-md font-bold text-xs transition border ${
                      humanReview.classification === 'yes'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setHumanReview({ ...humanReview, classification: 'needs_review' })}
                    className={`flex-1 py-1.5 px-3 rounded-md font-bold text-xs transition border ${
                      humanReview.classification === 'needs_review'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Needs Review
                  </button>
                </div>
              </div>

              {/* Item 2: Bounding Box Review */}
              <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-2">
                <span className="text-gray-700 font-semibold block">
                  2. Is the detected defect location correct? <span className="text-red-500">*</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHumanReview({ ...humanReview, boundingBox: 'acceptable' })}
                    className={`flex-1 py-1.5 px-3 rounded-md font-bold text-xs transition border ${
                      humanReview.boundingBox === 'acceptable'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Acceptable
                  </button>
                  <button
                    type="button"
                    onClick={() => setHumanReview({ ...humanReview, boundingBox: 'needs_review' })}
                    className={`flex-1 py-1.5 px-3 rounded-md font-bold text-xs transition border ${
                      humanReview.boundingBox === 'needs_review'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Needs Review
                  </button>
                </div>
              </div>

              {/* Item 3: XAI Model Focus Review */}
              <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-2">
                <span className="text-gray-700 font-semibold block">
                  3. Is the model focus relevant to the detected defect region? <span className="text-red-500">*</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHumanReview({ ...humanReview, xaiFocus: 'relevant' })}
                    className={`flex-1 py-1.5 px-3 rounded-md font-bold text-xs transition border ${
                      humanReview.xaiFocus === 'relevant'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Relevant
                  </button>
                  <button
                    type="button"
                    onClick={() => setHumanReview({ ...humanReview, xaiFocus: 'needs_review' })}
                    className={`flex-1 py-1.5 px-3 rounded-md font-bold text-xs transition border ${
                      humanReview.xaiFocus === 'needs_review'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Needs Review
                  </button>
                </div>
              </div>
            </div>

            {/* Item 4: Optional Review Note */}
            <div>
              <label className="block text-gray-700 font-semibold text-xs mb-1">
                Review Note (Optional)
              </label>
              <textarea
                rows={2}
                value={humanReview.note}
                onChange={(e) => setHumanReview({ ...humanReview, note: e.target.value })}
                placeholder="Add a short note if the result needs further review."
                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Action Buttons after detection */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2.5">
              <button 
                onClick={handleNavigateToScreen5}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow transition flex items-center gap-2"
              >
                <Search className="w-4 h-4" /> View Defect & Investigate Causes
              </button>

              <button 
                onClick={handleOpenFlagModal}
                className={`px-3.5 py-2 font-bold rounded-lg text-xs border transition flex items-center gap-1.5 ${
                  hasNeedsReview
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400 ring-offset-1 animate-pulse shadow-md'
                    : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200'
                }`}
              >
                <Flag className="w-3.5 h-3.5" /> Flag Incorrect Result {hasNeedsReview ? '(Recommended)' : ''}
              </button>
            </div>

            <button 
              disabled={!isReviewComplete}
              onClick={handleSaveInspection}
              className={`px-5 py-2 font-bold rounded-lg text-xs shadow transition flex items-center gap-2 ${
                isReviewComplete
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
              }`}
            >
              <Save className="w-4 h-4" /> Save Inspection
            </button>
          </div>
        </div>
      )}

      {/* FLAG INCORRECT MODAL */}
      {isFlagModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-200 animate-scale-in">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-orange-600" /> Flag Incorrect Inspection Result
              </h3>
              <button onClick={() => setIsFlagModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFeedback} className="space-y-4 text-xs">
              <div className="space-y-2 bg-gray-50 p-3 rounded-lg border">
                <p className="font-bold text-gray-700 mb-1">Select Incorrect Components:</p>
                <label className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={flagFeedback.incorrectClass}
                    onChange={e => setFlagFeedback({ ...flagFeedback, incorrectClass: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  Incorrect defect class
                </label>

                <label className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={flagFeedback.incorrectBox}
                    onChange={e => setFlagFeedback({ ...flagFeedback, incorrectBox: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  Incorrect bounding box
                </label>

                <label className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={flagFeedback.incorrectExplanation}
                    onChange={e => setFlagFeedback({ ...flagFeedback, incorrectExplanation: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  Incorrect XAI explanation
                </label>
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Feedback Note</label>
                <textarea 
                  rows={3}
                  value={flagFeedback.note}
                  onChange={e => setFlagFeedback({ ...flagFeedback, note: e.target.value })}
                  placeholder="Provide details on the discrepancy to help fine-tune future model evaluations..."
                  className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsFlagModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded shadow transition"
                >
                  Save Feedback
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
              <li>Current detection boxes, confidence values and XAI outputs may use precomputed demonstration data. Final research implementation will replace these with validated model outputs.</li>
              <li>No live fabric-inspection model is executed in the browser at this proposal stage.</li>
              <li>Displayed model/XAI outputs must not be interpreted as proof of physical causality.</li>
              <li>Human quality-team review is required.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
