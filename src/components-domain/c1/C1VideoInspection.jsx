import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadLocal, saveLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Video, 
  Upload, 
  Play, 
  Pause, 
  Square, 
  Search, 
  FastForward, 
  Save, 
  Eye, 
  FileText, 
  CheckCircle2, 
  Cpu, 
  Clock, 
  Layers,
  ChevronLeft,
  ChevronRight
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
const MASTER_VIDEOS = ['VID-001', 'VID-002', 'VID-003'];

// Precomputed unique grouped defect events (consecutive frames grouped into 1 physical event)
const GROUPED_DEFECT_EVENTS_FIXTURE = [
  {
    event_id: 'EVT-001',
    defect_class: 'Stain',
    confidence: 91,
    first_seen: '00:03.20',
    first_seen_frame: 96,
    last_seen: '00:03.34',
    last_seen_frame: 204,
    observed_frames: 4,
    status: 'Pending Review',
    bbox: { x: '35%', top: '28%', width: '38%', height: '42%' }
  },
  {
    event_id: 'EVT-002',
    defect_class: 'Cut',
    confidence: 88,
    first_seen: '00:06.16',
    first_seen_frame: 201,
    last_seen: '00:06.28',
    last_seen_frame: 412,
    observed_frames: 3,
    status: 'Pending Review',
    bbox: { x: '30%', top: '25%', width: '40%', height: '45%' }
  },
  {
    event_id: 'EVT-003',
    defect_class: 'Contamination',
    confidence: 86,
    first_seen: '00:11.25',
    first_seen_frame: 720,
    last_seen: '00:11.42',
    last_seen_frame: 735,
    observed_frames: 5,
    status: 'Pending Review',
    bbox: { x: '25%', top: '22%', width: '45%', height: '48%' }
  }
];

export default function C1VideoInspection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const passedModelId = searchParams.get('model');

  const [c1State] = useState(() => loadLocal('smartapparel.c1.state', { defaultModel: 'model_yolov8n' }));
  
  // Model selection (Pre-select recommended model if passed from Screen 2, else default model)
  const [selectedModelId, setSelectedModelId] = useState(() => passedModelId || c1State.defaultModel);

  // 1. Inspection Context State
  const [contextData, setContextData] = useState({
    factoryId: 'FAC-001',
    lineId: 'LINE-03',
    machineId: 'MC-014',
    rollId: 'ROLL-2026-104',
    batchId: 'PB-4021',
    shift: 'SHIFT-A',
    inspectionPoint: 'FABRIC_QC',
    videoId: 'VID-001'
  });

  // Upload & Video Player State
  const [uploadedVideoFile, setUploadedVideoFile] = useState(null);
  const [uploadedVideoName, setUploadedVideoName] = useState('factory_roll_scan_01.mp4');
  const [isPreloadedDemo, setIsPreloadedDemo] = useState(true);
  const [videoUrl, setVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');

  // Video Analysis Execution State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState('00:00.00');
  const [toastMessage, setToastMessage] = useState(null);
  
  // Detection Browsing State (null when no defect detected yet)
  const [selectedDetectionIndex, setSelectedDetectionIndex] = useState(null);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Cascading Master Data Helpers
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
    Boolean(contextData.videoId);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedVideoFile(file);
      setUploadedVideoName(file.name);
      setVideoUrl(url);
      setIsPreloadedDemo(false);
      setAnalysisComplete(false);
      setIsAnalyzing(false);
      setSelectedDetectionIndex(null);
      setCurrentFrame(0);
      showToast(`Uploaded video "${file.name}" ready for inspection analysis.`);
    }
  };

  const handleRemoveVideo = () => {
    setUploadedVideoFile(null);
    setUploadedVideoName('');
    setVideoUrl(null);
    setIsPreloadedDemo(false);
    setAnalysisComplete(false);
    setIsAnalyzing(false);
    setSelectedDetectionIndex(null);
    setCurrentFrame(0);
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleStartAnalysis = () => {
    if (!isContextValid || !selectedModelId || !videoUrl) {
      showToast("Please complete inspection context, select a model and upload a video.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setSelectedDetectionIndex(null);
    showToast("Pipeline analysis started. Evaluating video frames...");

    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisComplete(true);
      // Auto-set to newest detected defect event (latest detection)
      const latestIndex = GROUPED_DEFECT_EVENTS_FIXTURE.length - 1;
      setSelectedDetectionIndex(latestIndex);
      const latestEvt = GROUPED_DEFECT_EVENTS_FIXTURE[latestIndex];
      setCurrentFrame(latestEvt.last_seen_frame);
      setCurrentPlaybackTime(latestEvt.last_seen);
      showToast("Video analysis complete. Grouped physical defect events generated.");
    }, 1800);
  };

  const handleStopAnalysis = () => {
    setIsAnalyzing(false);
    showToast("Analysis paused by operator.");
  };

  const handleNavigateToScreen5ForDetection = (eventObj) => {
    const activeModelObj = CANDIDATE_MODELS.find(m => m.id === selectedModelId) || { name: selectedModelId };
    
    const sessionData = {
      event_id: eventObj.event_id,
      inspection_id: 'INS-VID-001',
      entry_type: 'VIDEO_DETECTION',
      source_type: 'RECORDED_VIDEO',
      first_seen: eventObj.first_seen,
      last_seen: eventObj.last_seen,
      observed_frames: eventObj.observed_frames,
      representative_frame: `Frame ${eventObj.last_seen_frame}`,
      frame_number: eventObj.last_seen_frame,
      video_timestamp: eventObj.last_seen,
      context: contextData,
      additional_context: {
        orderId: 'ORD-9921',
        styleId: 'STY-SL-04',
        yarnBatchId: 'YB-8821',
        dyeBatchId: 'DB-9012',
        supplierId: 'SUP-TEX-04'
      },
      model: activeModelObj.name,
      uploaded_image: uploadedVideoName || 'factory_roll_scan_01.mp4',
      preview_url: 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=800&q=80',
      defect_class: eventObj.defect_class,
      confidence: eventObj.confidence,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      is_review_complete: true,
      is_review_accepted: true,
      has_needs_review: false,
      xai_method: 'Grad-CAM'
    };

    saveLocal('smartapparel.c1.active_inspection_session', sessionData);
    navigate(`/c1/event/${eventObj.event_id}`);
  };

  const handleNavigateToScreen5ForEvent = (eventObj) => {
    const activeModelObj = CANDIDATE_MODELS.find(m => m.id === selectedModelId) || { name: selectedModelId };
    
    const sessionData = {
      event_id: eventObj.event_id,
      inspection_id: 'INS-VID-001',
      entry_type: 'VIDEO_EVENT',
      source_type: 'RECORDED_VIDEO',
      first_seen: eventObj.first_seen,
      last_seen: eventObj.last_seen,
      observed_frames: eventObj.observed_frames,
      representative_frame: `Frame ${eventObj.last_seen_frame}`,
      frame_number: eventObj.last_seen_frame,
      video_timestamp: eventObj.last_seen,
      context: contextData,
      additional_context: {
        orderId: 'ORD-9921',
        styleId: 'STY-SL-04',
        yarnBatchId: 'YB-8821',
        dyeBatchId: 'DB-9012',
        supplierId: 'SUP-TEX-04'
      },
      model: activeModelObj.name,
      uploaded_image: uploadedVideoName || 'factory_roll_scan_01.mp4',
      preview_url: 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=800&q=80',
      defect_class: eventObj.defect_class,
      confidence: eventObj.confidence,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      is_review_complete: true,
      is_review_accepted: true,
      has_needs_review: false,
      xai_method: 'Grad-CAM'
    };

    saveLocal('smartapparel.c1.active_inspection_session', sessionData);
    navigate(`/c1/event/${eventObj.event_id}`);
  };

  const handleSaveAnalysis = () => {
    const activeModelObj = CANDIDATE_MODELS.find(m => m.id === selectedModelId) || { name: selectedModelId };
    
    const record = {
      analysis_id: `ANL-VIDEO-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      context: contextData,
      model: activeModelObj.name,
      video_name: uploadedVideoName || 'factory_roll_scan_01.mp4',
      video_id: contextData.videoId,
      performance: {
        input_fps: 30,
        processing_fps: 28,
        median_latency: '31 ms',
        p95_latency: '39 ms',
        xai_gen_time: '18 ms'
      },
      grouped_events: GROUPED_DEFECT_EVENTS_FIXTURE,
      review_status: 'Completed'
    };

    saveLocal('smartapparel.c1.video_analyses', [record, ...existing]);
    showToast('Recorded video analysis saved locally. Available in Inspection History & Reports (Screen 6).');
  };

  const selectedModelName = CANDIDATE_MODELS.find(m => m.id === selectedModelId)?.name || selectedModelId;

  // Navigation helpers for browsing detected defect events
  const totalDetected = analysisComplete ? GROUPED_DEFECT_EVENTS_FIXTURE.length : 0;
  const currentDefectObj = (analysisComplete && selectedDetectionIndex !== null) 
    ? GROUPED_DEFECT_EVENTS_FIXTURE[selectedDetectionIndex] 
    : null;

  const handlePrevDetection = () => {
    if (selectedDetectionIndex > 0) {
      const newIndex = selectedDetectionIndex - 1;
      setSelectedDetectionIndex(newIndex);
      const target = GROUPED_DEFECT_EVENTS_FIXTURE[newIndex];
      setCurrentFrame(target.last_seen_frame);
      setCurrentPlaybackTime(target.last_seen);
    }
  };

  const handleNextDetection = () => {
    if (selectedDetectionIndex < totalDetected - 1) {
      const newIndex = selectedDetectionIndex + 1;
      setSelectedDetectionIndex(newIndex);
      const target = GROUPED_DEFECT_EVENTS_FIXTURE[newIndex];
      setCurrentFrame(target.last_seen_frame);
      setCurrentPlaybackTime(target.last_seen);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-3 text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
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
              title="Recorded Factory Video Inspection" 
              description="Controlled Proxy for Live-Camera Inspection Evaluation" 
            />
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
          <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Recorded Video Proxy
          </div>
          <p className="italic font-bold text-amber-700">This is a recorded-video demonstration and not live production camera inference.</p>
        </div>
      </div>

      {/* 1. INSPECTION CONTEXT */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Inspection Context
            </h3>
            <p className="text-xs text-gray-500">
              Select or enter operational parameters to map video inspection runs to factory equipment and rolls.
            </p>
          </div>
          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded border border-gray-200">
            Master Data Selectors
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Factory */}
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

          {/* Production Line */}
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

          {/* Machine */}
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

          {/* Roll ID */}
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

          {/* Production Batch ID */}
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

          {/* Shift */}
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

          {/* Inspection Point */}
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

          {/* Video ID */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Video ID <span className="text-red-500">*</span>
            </label>
            <select
              value={contextData.videoId}
              onChange={(e) => setContextData({ ...contextData, videoId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium text-xs"
            >
              {MASTER_VIDEOS.map(vid => (
                <option key={vid} value={vid}>{vid}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. INSPECTION MODEL & UPLOAD RECORDED FACTORY VIDEO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Model Selection Panel */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Inspection Model <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
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
              Select an evaluated candidate detector model for recorded video stream processing.
            </p>
          </div>

          {/* Analysis Action Triggers */}
          <div className="pt-3 border-t border-gray-200 space-y-2">
            {!isAnalyzing ? (
              <button 
                disabled={!videoUrl || !isContextValid || !selectedModelId}
                onClick={handleStartAnalysis}
                className={`w-full py-3 rounded-lg font-bold text-xs shadow flex justify-center items-center gap-2 transition ${
                  videoUrl && isContextValid && selectedModelId
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Search className="w-4 h-4" /> Start Analysis
              </button>
            ) : (
              <button 
                onClick={handleStopAnalysis}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow flex justify-center items-center gap-2 transition"
              >
                <Square className="w-4 h-4" /> Stop Analysis
              </button>
            )}

            {(!videoUrl || !isContextValid || !selectedModelId) && (
              <p className="text-[10px] text-amber-600 text-center font-medium">
                {!isContextValid 
                  ? 'Complete required inspection context parameters' 
                  : !videoUrl 
                    ? 'Upload a video file to enable analysis' 
                    : 'Select an inspection model'}
              </p>
            )}
          </div>
        </div>

        {/* Upload & Video Preview Panel */}
        <div className="md:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Upload Recorded Factory Video
            </h3>
            <span className="text-[11px] text-gray-500">Supported formats: MP4, AVI, MOV</span>
          </div>

          <input 
            type="file" 
            accept="video/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleVideoUpload} 
          />

          {!videoUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50/50 hover:border-blue-300 transition space-y-3"
            >
              <Video className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-sm font-bold text-gray-700">Click to Choose Video File</p>
                <p className="text-xs text-gray-500 mt-0.5">Select a recorded factory roll scan video from your local device</p>
              </div>
              <button 
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Choose Video File
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-gray-500 font-semibold">
                    {isPreloadedDemo ? 'Preloaded Demo Video:' : 'Uploaded Video:'}
                  </span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 truncate">
                    {isPreloadedDemo ? 'Preloaded Recorded Factory Demo Video (factory_roll_scan_01.mp4)' : (uploadedVideoName || 'Custom Video File')}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 rounded text-[11px] font-medium text-gray-700"
                  >
                    Replace Video
                  </button>
                  <button 
                    type="button"
                    onClick={handleRemoveVideo}
                    className="px-2.5 py-1 bg-white border border-red-200 hover:bg-red-50 rounded text-[11px] font-medium text-red-600"
                  >
                    Remove Video
                  </button>
                </div>
              </div>

              {/* Video Player */}
              <div className="bg-slate-900 rounded-xl overflow-hidden flex flex-col min-h-[300px] shadow-inner border border-slate-800 relative">
                {isPreloadedDemo && (
                  <div className="absolute top-3 left-3 bg-blue-950/85 text-blue-200 text-[10px] font-bold px-2.5 py-1 rounded border border-blue-800 backdrop-blur-sm z-10 shadow">
                    Preloaded Recorded Factory Demo Video
                  </div>
                )}

                <div className="flex-1 relative flex items-center justify-center min-h-[260px]">
                  <video 
                    ref={videoRef} 
                    src={videoUrl} 
                    muted
                    playsInline
                    className="w-full max-h-[300px] object-contain bg-black" 
                    onTimeUpdate={(e) => {
                      const frame = Math.floor(e.target.currentTime * 30);
                      setCurrentFrame(frame);
                      const sec = Math.floor(e.target.currentTime);
                      const ms = Math.floor((e.target.currentTime % 1) * 100);
                      setCurrentPlaybackTime(`00:${sec < 10 ? '0' : ''}${sec}.${ms < 10 ? '0' : ''}${ms}`);
                    }}
                    onEnded={() => setIsPlaying(false)}
                  />
                </div>

                {/* Player Controls Bar */}
                <div className="bg-slate-800 p-2.5 flex items-center gap-3 text-slate-300 text-xs border-t border-slate-700">
                  <button 
                    type="button" 
                    onClick={handlePlayPause} 
                    className="p-1 hover:text-white bg-slate-700 rounded hover:bg-slate-600 transition"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <div className="flex-1 bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all" 
                      style={{ width: `${Math.min(100, (currentFrame / 300) * 100)}%` }}
                    />
                  </div>

                  <span className="font-mono text-[11px] text-slate-300">
                    Frame: <strong className="text-white">{currentFrame}</strong> ({currentPlaybackTime})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. LATEST DETECTED DEFECT (HORIZONTAL SCROLLABLE DEFECT VIEWER) */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-5">
        <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" /> Latest Detected Defect
            </h3>
            <p className="text-xs text-gray-500">
              Filter-isolated defect frames from recorded-video analysis. Scroll horizontally to select and review.
            </p>
          </div>
          <span className="text-[11px] bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded border border-blue-200">
            DEMO_PRECOMPUTED
          </span>
        </div>

        {!analysisComplete || GROUPED_DEFECT_EVENTS_FIXTURE.length === 0 ? (
          /* Empty / Initial State */
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-gray-500 space-y-2">
            <Eye className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="font-bold text-sm text-gray-700">No defect event detected yet.</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Start recorded video analysis to isolate and review detected defect frames. Normal frames with no defects are automatically filtered.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Horizontal Scrollable Row header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Detected Defects <span className="text-gray-400 font-normal normal-case">(← horizontally scrollable →)</span>
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {totalDetected} Detected Defect Frames
              </span>
            </div>

            {/* Horizontal Scrollable Cards Container */}
            <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-gray-300 snap-x">
              {GROUPED_DEFECT_EVENTS_FIXTURE.map((evt, idx) => {
                const isSelected = selectedDetectionIndex === idx;
                const isLatest = idx === totalDetected - 1;

                return (
                  <div
                    key={evt.event_id}
                    onClick={() => {
                      setSelectedDetectionIndex(idx);
                      setCurrentFrame(evt.last_seen_frame);
                      setCurrentPlaybackTime(evt.last_seen);
                    }}
                    className={`snap-start min-w-[200px] max-w-[220px] p-3 rounded-xl border transition-all cursor-pointer flex-shrink-0 relative ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-400/50 shadow-md'
                        : 'bg-slate-50 border-gray-200 hover:bg-slate-100 hover:border-gray-300'
                    }`}
                  >
                    {/* Latest Badge */}
                    {isLatest && (
                      <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
                        Latest
                      </span>
                    )}

                    {/* Small preview thumbnail */}
                    <div className="w-full h-20 bg-slate-900 rounded-lg overflow-hidden relative mb-2 flex items-center justify-center">
                      <img
                        src="https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=400&q=80"
                        alt={evt.defect_class}
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div 
                        className="absolute border border-red-500 bg-red-500/30 rounded"
                        style={{
                          left: evt.bbox.x,
                          top: evt.bbox.top,
                          width: evt.bbox.width,
                          height: evt.bbox.height
                        }}
                      />
                      <span className="absolute bottom-1 left-1 bg-black/80 text-white text-[9px] px-1 rounded font-mono">
                        Frame {evt.last_seen_frame}
                      </span>
                    </div>

                    {/* Defect Card Metadata */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">{evt.defect_class}</span>
                        <span className="font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                          {evt.confidence}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                        <span>Frame: {evt.last_seen_frame}</span>
                        <span>{evt.last_seen}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <hr className="border-gray-200 my-2" />

            {/* SELECTED DETECTION DETAILS */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                Selected Detection
              </h4>

              {currentDefectObj && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Metadata Panel */}
                  <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 border border-slate-800 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                          Frame Diagnostics
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded border border-slate-700">
                          Detected Defect {selectedDetectionIndex + 1} of {totalDetected}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Defect:</span>
                          <span className="font-bold text-amber-400 text-sm">{currentDefectObj.defect_class}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Confidence:</span>
                          <span className="font-bold text-white text-sm">{currentDefectObj.confidence}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Frame:</span>
                          <span className="font-mono font-bold text-white text-sm">{currentDefectObj.last_seen_frame}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Timestamp:</span>
                          <span className="font-mono font-bold text-white">{currentDefectObj.last_seen}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-800">
                          <span className="text-slate-400 font-medium">Model:</span>
                          <span className="font-bold text-blue-400">{selectedModelName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 mt-4">
                      <span className="text-[10px] bg-slate-800 text-slate-400 font-medium px-2 py-1 rounded border border-slate-700 block text-center">
                        Prototype / Precomputed Detection
                      </span>
                    </div>
                  </div>

                  {/* Large Video Frame + Bounding Box Overlay */}
                  <div className="md:col-span-2 bg-slate-900 rounded-xl overflow-hidden min-h-[260px] max-h-[320px] flex items-center justify-center relative shadow-inner border border-slate-800">
                    <img 
                      src="https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=800&q=80" 
                      alt="Detected Video Frame" 
                      className="max-h-[300px] max-w-full object-contain"
                    />

                    {/* Red Bounding Box Overlay */}
                    <div 
                      className="absolute border-2 border-red-500 bg-red-500/20 rounded shadow-lg"
                      style={{
                        left: currentDefectObj.bbox.x,
                        top: currentDefectObj.bbox.top,
                        width: currentDefectObj.bbox.width,
                        height: currentDefectObj.bbox.height
                      }}
                    >
                      <span className="absolute -top-7 left-0 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                        {currentDefectObj.defect_class} ({currentDefectObj.confidence}%)
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 bg-slate-900/85 text-white px-3 py-1 rounded text-[11px] backdrop-blur-sm border border-slate-700 font-semibold">
                      Detected Video Frame (Frame {currentDefectObj.last_seen_frame})
                    </div>

                    <div className="absolute top-3 right-3 bg-amber-950/90 text-amber-200 text-[10px] font-bold px-2.5 py-1 rounded border border-amber-700 backdrop-blur-sm shadow">
                      DEMO_PRECOMPUTED
                    </div>
                  </div>
                </div>
              )}

              {/* View Defect & Investigate Causes Action Button */}
              {currentDefectObj && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                  <button 
                    type="button"
                    onClick={() => handleNavigateToScreen5ForDetection(currentDefectObj)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> View Defect & Investigate Causes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. PERFORMANCE PANEL */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-3">
        <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-600" /> Performance Benchmarks
          </h3>
          <span className="text-[11px] bg-amber-50 text-amber-800 font-semibold px-2.5 py-1 rounded border border-amber-200">
            Illustrative / Precomputed Performance Values
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
            <span className="text-gray-500 text-[10px] uppercase font-bold block">Input Video FPS</span>
            <span className="text-base font-bold text-gray-900 mt-0.5 block">30 FPS</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Original recording rate</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
            <span className="text-gray-500 text-[10px] uppercase font-bold block">Processing FPS</span>
            <span className="text-base font-bold text-emerald-600 mt-0.5 block">28 FPS</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Pipeline throughput</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
            <span className="text-gray-500 text-[10px] uppercase font-bold block">Median Latency</span>
            <span className="text-base font-bold text-blue-600 mt-0.5 block">31 ms</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">P50 inference time</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
            <span className="text-gray-500 text-[10px] uppercase font-bold block">P95 Latency</span>
            <span className="text-base font-bold text-indigo-600 mt-0.5 block">39 ms</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Worst-case frame time</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
            <span className="text-gray-500 text-[10px] uppercase font-bold block">XAI Gen Time</span>
            <span className="text-base font-bold text-purple-600 mt-0.5 block">18 ms</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Heatmap calculation</span>
          </div>
        </div>
      </div>

      {/* 5. DETECTED DEFECT EVENTS TABLE */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Detected Defect Events
            </h3>
            <p className="text-xs text-gray-500">
              Grouped physical defect events (consecutive frame detections unified into 1 physical event record).
            </p>
          </div>

          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded border border-gray-200">
            {GROUPED_DEFECT_EVENTS_FIXTURE.length} Grouped Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-gray-700 border-b border-gray-200">
                <th className="p-2.5 font-bold">Event ID</th>
                <th className="p-2.5 font-bold">Defect Class</th>
                <th className="p-2.5 font-bold">Confidence Summary</th>
                <th className="p-2.5 font-bold">First Seen</th>
                <th className="p-2.5 font-bold">Last Seen</th>
                <th className="p-2.5 font-bold">Observed Frames</th>
                <th className="p-2.5 font-bold">Status</th>
                <th className="p-2.5 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {GROUPED_DEFECT_EVENTS_FIXTURE.map((evt, idx) => (
                <tr 
                  key={evt.event_id} 
                  className={`hover:bg-blue-50/50 transition ${idx === selectedDetectionIndex ? 'bg-blue-50/80 font-medium' : ''}`}
                >
                  <td className="p-2.5 font-bold text-blue-700">{evt.event_id}</td>
                  <td className="p-2.5 font-bold text-gray-900">{evt.defect_class}</td>
                  <td className="p-2.5 font-bold text-gray-800">{evt.confidence}%</td>
                  <td className="p-2.5 font-mono text-gray-700">{evt.first_seen} (F{evt.first_seen_frame})</td>
                  <td className="p-2.5 font-mono text-gray-700">{evt.last_seen} (F{evt.last_seen_frame})</td>
                  <td className="p-2.5 font-bold text-gray-900">{evt.observed_frames} frames</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded border border-amber-200 text-[10px]">
                      {evt.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-right">
                    <button 
                      type="button"
                      onClick={() => handleNavigateToScreen5ForEvent(evt)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs inline-flex items-center gap-1 shadow-sm transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Event
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. BOTTOM ACTION BUTTONS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-end gap-3">
        <button 
          type="button"
          onClick={handleSaveAnalysis}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow transition flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Save Analysis
        </button>
      </div>
    </div>
  );
}
