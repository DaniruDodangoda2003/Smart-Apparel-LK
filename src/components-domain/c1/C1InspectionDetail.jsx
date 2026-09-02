import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadLocal, saveLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Activity, 
  Eye, 
  Layers, 
  Cpu, 
  Wrench, 
  Clock, 
  Package, 
  Check, 
  X, 
  HelpCircle, 
  Save, 
  Printer,
  Film
} from 'lucide-react';

const EVENT_FRAMES_FIXTURE_MAP = {
  'EVT-001': [
    { frameNumber: 201, timestamp: '00:03.20', confidence: 89, bbox: { x: '34%', top: '27%', width: '37%', height: '40%' } },
    { frameNumber: 202, timestamp: '00:03.24', confidence: 91, bbox: { x: '35%', top: '28%', width: '38%', height: '42%' } },
    { frameNumber: 203, timestamp: '00:03.28', confidence: 90, bbox: { x: '35%', top: '28%', width: '38%', height: '41%' } },
    { frameNumber: 204, timestamp: '00:03.34', confidence: 91, bbox: { x: '36%', top: '29%', width: '39%', height: '42%' } }
  ],
  'EVT-002': [
    { frameNumber: 410, timestamp: '00:06.16', confidence: 85, bbox: { x: '29%', top: '24%', width: '39%', height: '44%' } },
    { frameNumber: 411, timestamp: '00:06.22', confidence: 87, bbox: { x: '30%', top: '25%', width: '40%', height: '45%' } },
    { frameNumber: 412, timestamp: '00:06.28', confidence: 88, bbox: { x: '31%', top: '25%', width: '40%', height: '45%' } }
  ],
  'EVT-003': [
    { frameNumber: 731, timestamp: '00:11.25', confidence: 82, bbox: { x: '24%', top: '21%', width: '44%', height: '47%' } },
    { frameNumber: 732, timestamp: '00:11.30', confidence: 84, bbox: { x: '25%', top: '22%', width: '45%', height: '48%' } },
    { frameNumber: 733, timestamp: '00:11.34', confidence: 85, bbox: { x: '25%', top: '22%', width: '45%', height: '48%' } },
    { frameNumber: 734, timestamp: '00:11.38', confidence: 86, bbox: { x: '25%', top: '22%', width: '45%', height: '48%' } },
    { frameNumber: 735, timestamp: '00:11.42', confidence: 86, bbox: { x: '26%', top: '23%', width: '46%', height: '49%' } }
  ]
};

const PROBABLE_CAUSES_BY_DEFECT = {
  'Stain': [
    {
      rank: 1,
      id: 'cause_stain_01',
      probableCause: 'Lubrication Contamination from Machine Bearings',
      supportingEvidence: 'Recent lubrication / maintenance activity (Completed 2026-08-28 on MC-014)',
      missingEvidence: 'Independent physical chemical analysis confirmation unavailable'
    },
    {
      rank: 2,
      id: 'cause_stain_02',
      probableCause: 'Material Handling Contamination',
      supportingEvidence: 'Handling / operational context during shift transition (SHIFT-A)',
      missingEvidence: 'Direct video handling footage confirmation unavailable'
    },
    {
      rank: 3,
      id: 'cause_stain_03',
      probableCause: 'Raw-Material Yarn/Dye Contamination',
      supportingEvidence: 'Supplier / material batch association (PB-4021 / YB-8821)',
      missingEvidence: 'Independent yarn/dye batch lab confirmation unavailable'
    }
  ],
  'Cut': [
    {
      rank: 1,
      id: 'cause_cut_01',
      probableCause: 'Needle Friction Damage / Mechanical Blade Alignment Fault',
      supportingEvidence: 'High machine operating speed (28 m/min) and recent tension roller bearing adjustment',
      missingEvidence: 'Blade wear sensor telemetry unavailable'
    },
    {
      rank: 2,
      id: 'cause_cut_02',
      probableCause: 'High Warp Tension Snagging during High-Speed Weaving',
      supportingEvidence: 'High tension setting (1.2N) on high-speed inspection roller',
      missingEvidence: 'Real-time yarn tension log stream unavailable'
    },
    {
      rank: 3,
      id: 'cause_cut_03',
      probableCause: 'Raw Material Filament Tensile Failure',
      supportingEvidence: 'Yarn batch YB-8821 tensile strength variance report',
      missingEvidence: 'Lab destructive yarn break test data pending'
    }
  ],
  'Contamination': [
    {
      rank: 1,
      id: 'cause_contam_01',
      probableCause: 'Foreign Fiber Ingestion in Feed Mechanism',
      supportingEvidence: 'Inspection Point: FABRIC_QC inbound lint filter maintenance log',
      missingEvidence: 'Microscopic fiber spectrum composition analysis pending'
    },
    {
      rank: 2,
      id: 'cause_contam_02',
      probableCause: 'Airflow Dust / Airborne Lint Accumulation',
      supportingEvidence: 'Shift A environmental humidity & dust sensor variance',
      missingEvidence: 'Cleanroom HVAC particle counter log unavailable'
    },
    {
      rank: 3,
      id: 'cause_contam_03',
      probableCause: 'Unfiltered Lubricant Splatter',
      supportingEvidence: 'MC-014 bearing grease service record',
      missingEvidence: 'Chemical UV fluorescence splatter test confirmation pending'
    }
  ]
};

export default function C1InspectionDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  // Load active session passed from Screen 3 or Screen 4
  const [session] = useState(() => {
    const active = loadLocal('smartapparel.c1.active_inspection_session', null);
    if (active) return active;

    // Default fallback dataset for Screen 5 demonstration
    return {
      event_id: eventId || 'EVT-019',
      inspection_id: 'INS-0013',
      entry_type: 'IMAGE',
      source_type: 'IMAGE',
      context: {
        factoryId: 'FAC-001',
        lineId: 'LINE-03',
        machineId: 'MC-014',
        rollId: 'ROLL-2026-104',
        batchId: 'PB-4021',
        shift: 'SHIFT-A',
        inspectionPoint: 'FABRIC_QC',
        operatorRef: 'OP-ANON-021',
        videoId: 'VID-001'
      },
      additional_context: {
        orderId: 'ORD-9921',
        styleId: 'STY-SL-04',
        yarnBatchId: 'YB-8821',
        dyeBatchId: 'DB-9012',
        supplierId: 'SUP-TEX-04'
      },
      model: 'YOLOv8n',
      uploaded_image: 'fabric_sample_01.jpg',
      preview_url: 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=800&q=80',
      defect_class: 'Stain',
      confidence: 91,
      timestamp: '2026-09-02 09:02',
      is_review_complete: true,
      is_review_accepted: true,
      has_needs_review: false,
      xai_method: 'Grad-CAM'
    };
  });

  // Entry Type Resolution: IMAGE, VIDEO_DETECTION, or VIDEO_EVENT
  const entryType = session.entry_type || (session.source_type === 'IMAGE' ? 'IMAGE' : 'VIDEO_EVENT');
  const isVideoSource = session.source_type === 'RECORDED_VIDEO' || session.source_type === 'VIDEO';

  // Frame Evidence List belonging to this event
  const availableFrames = (isVideoSource && EVENT_FRAMES_FIXTURE_MAP[session.event_id]) || [
    { 
      frameNumber: session.frame_number || 204, 
      timestamp: session.video_timestamp || session.last_seen || session.timestamp || '00:03.34', 
      confidence: session.confidence || 91, 
      bbox: { x: '35%', top: '28%', width: '38%', height: '42%' } 
    }
  ];

  // Selected Frame Index State (for VIDEO_EVENT or single frame)
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(availableFrames.length - 1);
  const selectedFrameObj = availableFrames[selectedFrameIndex] || availableFrames[0];

  // Human Cause Review State (Unselected by default as specified)
  const [causeReviews, setCauseReviews] = useState({}); // { cause_id: 'Relevant' | 'Not Relevant' | 'Insufficient Evidence' }
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Dynamically resolve defect-specific ranked probable causes for the WHOLE event
  const activeProbableCauses = PROBABLE_CAUSES_BY_DEFECT[session.defect_class] || PROBABLE_CAUSES_BY_DEFECT['Stain'];

  // Determine Human Review Status Badge Text
  const getReviewStatusLabel = () => {
    if (!session.is_review_complete) return 'Human Review Pending';
    if (session.is_review_accepted) return 'Human Review Accepted';
    if (session.has_needs_review) return 'Human Review: Needs Review';
    return 'Human Review Completed';
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCauseReviewSelect = (causeId, status) => {
    setCauseReviews(prev => ({
      ...prev,
      [causeId]: status
    }));
  };

  const handleSaveAction = () => {
    const auditRecord = {
      event_id: session.event_id,
      inspection_id: session.inspection_id,
      entry_type: entryType,
      selected_frame: selectedFrameObj.frameNumber,
      timestamp: new Date().toISOString(),
      cause_reviews: causeReviews,
      corrective_action: correctiveAction,
      review_notes: reviewNotes,
      reviewed_by: 'QC Manager (OP-ANON-021)',
      reviewed_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const existingAudit = loadLocal('smartapparel.c1.cause_investigations', []);
    saveLocal('smartapparel.c1.cause_investigations', [auditRecord, ...existingAudit]);
    showToast('Investigation action and cause reviews saved successfully.');
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
            onClick={() => navigate(isVideoSource ? '/c1/inspect-video' : '/c1/inspect-image')} 
            className="p-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm"
            title={isVideoSource ? 'Return to Recorded Factory Video Inspection' : 'Return to Manual Image Inspection'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <PageHeader 
              title="Defect Event Details & Probable Cause Investigation" 
              description="Review frame-level evidence and investigate probable causes for the selected defect event." 
            />
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
          <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            <span className="font-bold text-gray-700">Entry Mode:</span> {entryType} | <span className="font-bold text-gray-700">Event:</span> {session.event_id || 'EVT-019'}
          </div>
          <p className="italic font-bold text-gray-600">DEMO_PRECOMPUTED | Prototype / Illustrative Data</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SOURCE-SPECIFIC EVIDENCE SECTION                                          */}
      {/* ========================================================================= */}

      {/* 1. ENTRY TYPE: MANUAL IMAGE INSPECTION */}
      {entryType === 'IMAGE' && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" /> Image Detection Evidence
              </h3>
              <p className="text-xs text-gray-500">
                Single fabric image inspection result passed directly from Manual Image Inspection.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 text-white text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-800 flex-wrap">
              <span>Event: <strong className="text-emerald-400">{session.event_id || 'EVT-019'}</strong></span>
              <span className="text-slate-500">|</span>
              <span>Defect: <strong className="text-amber-400">{session.defect_class || 'Stain'}</strong></span>
              <span className="text-slate-500">|</span>
              <span>Conf: <strong className="text-white">{session.confidence || 91}%</strong></span>
              <span className="text-slate-500">|</span>
              <span>Model: <strong className="text-blue-400">{session.model || 'YOLOv8n'}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Panel: Detection Evidence */}
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 text-xs">
                <span className="font-bold text-gray-800">Detection Evidence</span>
                <span className="text-blue-600 font-semibold">{session.defect_class || 'Stain'} – {session.confidence || 91}%</span>
              </div>

              <div className="bg-slate-900 rounded-lg overflow-hidden min-h-[300px] max-h-[360px] flex items-center justify-center relative shadow-inner">
                <img 
                  src={session.preview_url || 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=800&q=80'} 
                  alt="Detection Evidence Base" 
                  className="max-h-[340px] max-w-full object-contain" 
                />

                {/* Red Bounding Box Overlay */}
                <div 
                  className="absolute border-2 border-red-500 bg-red-500/20 rounded shadow-lg"
                  style={{ left: '30%', top: '25%', width: '40%', height: '45%' }}
                >
                  <span className="absolute -top-7 left-0 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                    {session.defect_class || 'Stain'} ({session.confidence || 91}%)
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 bg-slate-900/80 text-blue-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-semibold">
                  Detected defect region
                </div>
              </div>
            </div>

            {/* Right Panel: Model Focus */}
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 text-xs">
                <span className="font-bold text-gray-800">Model Focus</span>
                <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Method: {session.xai_method || 'Grad-CAM'}
                </span>
              </div>

              <div className="bg-slate-900 rounded-lg overflow-hidden min-h-[300px] max-h-[360px] flex items-center justify-center relative shadow-inner">
                <img 
                  src={session.preview_url || 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=800&q=80'} 
                  alt="Model Focus Base" 
                  className="max-h-[340px] max-w-full object-contain" 
                />

                {/* Heatmap Overlay */}
                <div 
                  className="absolute pointer-events-none rounded-full"
                  style={{
                    left: '30%',
                    top: '25%',
                    width: '40%',
                    height: '45%',
                    background: session.xai_method === 'Grad-CAM++'
                      ? 'radial-gradient(circle at 50% 48%, rgba(220, 38, 38, 0.92) 0%, rgba(234, 88, 12, 0.82) 22%, rgba(202, 138, 4, 0.65) 45%, rgba(99, 102, 241, 0.4) 68%, transparent 85%)'
                      : 'radial-gradient(circle at 50% 48%, rgba(239, 68, 68, 0.85) 0%, rgba(249, 115, 22, 0.75) 30%, rgba(234, 179, 8, 0.55) 55%, rgba(59, 130, 246, 0.35) 75%, transparent 92%)',
                    filter: 'blur(3px)',
                    mixBlendMode: 'screen'
                  }}
                />

                <div className="absolute top-3 right-3 bg-purple-950/90 text-purple-200 text-[10px] font-bold px-2 py-1 rounded border border-purple-800 shadow">
                  {session.xai_method || 'Grad-CAM'} Explanation Overlay
                </div>

                <div className="absolute bottom-3 left-3 bg-slate-900/80 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-semibold">
                  Model attention area
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>"The heatmap indicates model focus and is not proof of physical causality."</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ENTRY TYPE: VIDEO – LATEST DETECTED DEFECT */}
      {entryType === 'VIDEO_DETECTION' && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" /> Selected Video Detection
              </h3>
              <p className="text-xs text-gray-500">
                Exact detected frame selected from Recorded Factory Video Inspection.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 text-white text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-800 flex-wrap">
              <span>Frame: <strong className="text-emerald-400">{session.frame_number || 735}</strong></span>
              <span className="text-slate-500">|</span>
              <span>Timestamp: <strong className="text-white">{session.video_timestamp || session.last_seen || '00:11.42'}</strong></span>
              <span className="text-slate-500">|</span>
              <span>Defect: <strong className="text-amber-400">{session.defect_class || 'Contamination'}</strong></span>
              <span className="text-slate-500">|</span>
              <span>Conf: <strong className="text-white">{session.confidence || 86}%</strong></span>
              <span className="text-slate-500">|</span>
              <span>Model: <strong className="text-blue-400">{session.model || 'YOLOv8n'}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Panel: Detection Evidence */}
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 text-xs">
                <span className="font-bold text-gray-800">
                  Selected Video Frame ({session.representative_frame || `Frame ${session.frame_number || 735}`})
                </span>
                <span className="text-blue-600 font-semibold">{session.defect_class} – {session.confidence}%</span>
              </div>

              <div className="bg-slate-900 rounded-lg overflow-hidden min-h-[300px] max-h-[360px] flex items-center justify-center relative shadow-inner">
                <img 
                  src={session.preview_url || 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=800&q=80'} 
                  alt="Selected Frame Base" 
                  className="max-h-[340px] max-w-full object-contain" 
                />

                {/* Red Bounding Box Overlay */}
                <div 
                  className="absolute border-2 border-red-500 bg-red-500/20 rounded shadow-lg"
                  style={{ left: '26%', top: '23%', width: '46%', height: '49%' }}
                >
                  <span className="absolute -top-7 left-0 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                    {session.defect_class} ({session.confidence}%)
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 bg-slate-900/80 text-blue-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-semibold">
                  Detected defect region (Frame {session.frame_number || 735})
                </div>
              </div>
            </div>

            {/* Right Panel: Model Focus */}
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 text-xs">
                <span className="font-bold text-gray-800">Model Focus</span>
                <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Method: {session.xai_method || 'Grad-CAM'}
                </span>
              </div>

              <div className="bg-slate-900 rounded-lg overflow-hidden min-h-[300px] max-h-[360px] flex items-center justify-center relative shadow-inner">
                <img 
                  src={session.preview_url || 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=800&q=80'} 
                  alt="Model Focus Base" 
                  className="max-h-[340px] max-w-full object-contain" 
                />

                {/* Heatmap Overlay */}
                <div 
                  className="absolute pointer-events-none rounded-full"
                  style={{
                    left: '26%',
                    top: '23%',
                    width: '46%',
                    height: '49%',
                    background: 'radial-gradient(circle at 50% 48%, rgba(239, 68, 68, 0.85) 0%, rgba(249, 115, 22, 0.75) 30%, rgba(234, 179, 8, 0.55) 55%, rgba(59, 130, 246, 0.35) 75%, transparent 92%)',
                    filter: 'blur(3px)',
                    mixBlendMode: 'screen'
                  }}
                />

                <div className="absolute top-3 right-3 bg-purple-950/90 text-purple-200 text-[10px] font-bold px-2 py-1 rounded border border-purple-800 shadow">
                  {session.xai_method || 'Grad-CAM'} Explanation Overlay
                </div>

                <div className="absolute bottom-3 left-3 bg-slate-900/80 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-semibold">
                  Model attention area (Frame {session.frame_number || 735})
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>"The heatmap indicates model focus and is not proof of physical causality."</span>
              </div>
            </div>
          </div>

          {/* Small Related Event Badge Below Frame Panels */}
          {session.event_id && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" /> Related Grouped Defect Event: <span className="text-blue-700">{session.event_id}</span>
              </span>
              <div className="flex gap-4 font-mono text-gray-600">
                <span>First Seen: <strong className="text-gray-900">{session.first_seen || '00:11.25'}</strong></span>
                <span>Last Seen: <strong className="text-gray-900">{session.last_seen || '00:11.42'}</strong></span>
                <span>Observed Frames: <strong className="text-gray-900">{session.observed_frames || 5} frames</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. ENTRY TYPE: VIDEO – DETECTED DEFECT EVENT */}
      {entryType === 'VIDEO_EVENT' && (
        <div className="space-y-6">
          {/* Horizontal Frame Strip */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-3">
            <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Film className="w-4 h-4 text-blue-600" /> Event Frame Evidence
                </h3>
                <p className="text-xs text-gray-500">
                  All observed frame detections belonging to grouped event <strong className="text-blue-700">{session.event_id}</strong> ({availableFrames.length} frames). Click any frame to inspect visual evidence.
                </p>
              </div>

              <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded border border-gray-200">
                {availableFrames.length} Frame Observations
              </span>
            </div>

            {/* Horizontal Scrollable Frame Cards */}
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-gray-300 snap-x">
              {availableFrames.map((frm, idx) => {
                const isSelected = selectedFrameIndex === idx;
                return (
                  <div
                    key={frm.frameNumber}
                    onClick={() => setSelectedFrameIndex(idx)}
                    className={`snap-start min-w-[170px] max-w-[190px] p-2.5 rounded-xl border transition-all cursor-pointer flex-shrink-0 relative ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-400/50 shadow-md'
                        : 'bg-slate-50 border-gray-200 hover:bg-slate-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-full h-16 bg-slate-900 rounded-lg overflow-hidden relative mb-2 flex items-center justify-center">
                      <img
                        src={session.preview_url || 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=400&q=80'}
                        alt={`Frame ${frm.frameNumber}`}
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div 
                        className="absolute border border-red-500 bg-red-500/30 rounded"
                        style={{
                          left: frm.bbox.x,
                          top: frm.bbox.top,
                          width: frm.bbox.width,
                          height: frm.bbox.height
                        }}
                      />
                      <span className="absolute bottom-1 left-1 bg-black/80 text-white text-[9px] px-1 rounded font-mono">
                        Frame {frm.frameNumber}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">Frame {frm.frameNumber}</span>
                        <span className="font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                          {frm.confidence}%
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        Time: {frm.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Frame Evidence Panels */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" /> Selected Frame Evidence
                </h3>
                <p className="text-xs text-gray-500">
                  Bounding box and model focus heatmap for frame {selectedFrameObj.frameNumber}.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 text-white text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-800 flex-wrap">
                <span>Selected Frame: <strong className="text-emerald-400">{selectedFrameObj.frameNumber}</strong></span>
                <span className="text-slate-500">|</span>
                <span>Timestamp: <strong className="text-white">{selectedFrameObj.timestamp}</strong></span>
                <span className="text-slate-500">|</span>
                <span>Defect: <strong className="text-amber-400">{session.defect_class}</strong></span>
                <span className="text-slate-500">|</span>
                <span>Conf: <strong className="text-white">{selectedFrameObj.confidence}%</strong></span>
                <span className="text-slate-500">|</span>
                <span>Model: <strong className="text-blue-400">{session.model || 'YOLOv8n'}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Panel: Detection Evidence */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 text-xs">
                  <span className="font-bold text-gray-800">
                    Detection Evidence (Frame {selectedFrameObj.frameNumber})
                  </span>
                  <span className="text-blue-600 font-semibold">{session.defect_class} – {selectedFrameObj.confidence}%</span>
                </div>

                <div className="bg-slate-900 rounded-lg overflow-hidden min-h-[300px] max-h-[360px] flex items-center justify-center relative shadow-inner">
                  <img 
                    src={session.preview_url || 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=800&q=80'} 
                    alt="Detection Evidence Base" 
                    className="max-h-[340px] max-w-full object-contain" 
                  />

                  {/* Bounding Box Overlay */}
                  <div 
                    className="absolute border-2 border-red-500 bg-red-500/20 rounded shadow-lg"
                    style={{
                      left: selectedFrameObj.bbox?.x || '30%',
                      top: selectedFrameObj.bbox?.top || '25%',
                      width: selectedFrameObj.bbox?.width || '40%',
                      height: selectedFrameObj.bbox?.height || '45%'
                    }}
                  >
                    <span className="absolute -top-7 left-0 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                      {session.defect_class} ({selectedFrameObj.confidence}%)
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 bg-slate-900/80 text-blue-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-semibold">
                    Detected defect region (Frame {selectedFrameObj.frameNumber})
                  </div>
                </div>
              </div>

              {/* Right Panel: Model Focus */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 text-xs">
                  <span className="font-bold text-gray-800">Model Focus</span>
                  <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Method: {session.xai_method || 'Grad-CAM'}
                  </span>
                </div>

                <div className="bg-slate-900 rounded-lg overflow-hidden min-h-[300px] max-h-[360px] flex items-center justify-center relative shadow-inner">
                  <img 
                    src={session.preview_url || 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?auto=format&fit=crop&w=800&q=80'} 
                    alt="Model Focus Base" 
                    className="max-h-[340px] max-w-full object-contain" 
                  />

                  {/* Heatmap Overlay */}
                  <div 
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      left: selectedFrameObj.bbox?.x || '30%',
                      top: selectedFrameObj.bbox?.top || '25%',
                      width: selectedFrameObj.bbox?.width || '40%',
                      height: selectedFrameObj.bbox?.height || '45%',
                      background: 'radial-gradient(circle at 50% 48%, rgba(239, 68, 68, 0.85) 0%, rgba(249, 115, 22, 0.75) 30%, rgba(234, 179, 8, 0.55) 55%, rgba(59, 130, 246, 0.35) 75%, transparent 92%)',
                      filter: 'blur(3px)',
                      mixBlendMode: 'screen'
                    }}
                  />

                  <div className="absolute top-3 right-3 bg-purple-950/90 text-purple-200 text-[10px] font-bold px-2 py-1 rounded border border-purple-800 shadow">
                    {session.xai_method || 'Grad-CAM'} Explanation Overlay
                  </div>

                  <div className="absolute bottom-3 left-3 bg-slate-900/80 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-semibold">
                    Model attention area (Frame {selectedFrameObj.frameNumber})
                  </div>
                </div>

                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>"The heatmap indicates model focus and is not proof of physical causality."</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMMON SECTIONS (ALL 3 ENTRY TYPES)                                       */}
      {/* ========================================================================= */}

      {/* 4. COMMON INSPECTION / EVENT SUMMARY */}
      <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-800 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" /> Inspection / Event Summary
          </h3>
          <span className="text-xs bg-slate-800 text-blue-300 font-bold px-3 py-1 rounded border border-slate-700">
            Source Type: {session.source_type || 'IMAGE'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Event ID</span>
            <span className="font-bold text-white text-sm mt-0.5 block">{session.event_id || 'EVT-019'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Inspection ID</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{session.inspection_id || 'INS-0013'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Factory Unit</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{session.context?.factoryId || 'FAC-001'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Production Line</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{session.context?.lineId || 'LINE-03'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Machine</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{session.context?.machineId || 'MC-014'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Roll ID</span>
            <span className="font-bold text-blue-400 mt-0.5 block">{session.context?.rollId || 'ROLL-2026-104'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Production Batch</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{session.context?.batchId || 'PB-4021'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Defect Class</span>
            <span className="font-bold text-amber-400 text-sm mt-0.5 block">{session.defect_class || 'Stain'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Confidence</span>
            <span className="font-bold text-white mt-0.5 block">{session.confidence ? `${session.confidence}%` : '91%'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Inspection Model</span>
            <span className="font-bold text-blue-300 mt-0.5 block">{session.model || 'YOLOv8n'}</span>
          </div>

          {isVideoSource ? (
            <>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">First Seen</span>
                <span className="font-mono text-slate-300 mt-0.5 block">{session.first_seen || '00:03.20'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Last Seen</span>
                <span className="font-mono text-slate-300 mt-0.5 block">{session.last_seen || '00:03.34'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Observed Frames</span>
                <span className="font-bold text-emerald-300 mt-0.5 block">{session.observed_frames || availableFrames.length} frames</span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Detection Timestamp</span>
              <span className="font-semibold text-slate-300 mt-0.5 block">{session.timestamp || '2026-09-02 09:02'}</span>
            </div>
          )}

          <div className="col-span-2">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Human Review Status</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded border inline-block ${
              session.is_review_accepted 
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                : session.has_needs_review 
                  ? 'bg-amber-950 text-amber-300 border-amber-800' 
                  : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {getReviewStatusLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* 5. COMMON RELEVANT FACTORY METADATA */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> Relevant Factory Metadata
          </h3>
          <p className="text-xs text-gray-500">Operational information organized to support overall probable cause investigation.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* A. MACHINE */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" /> A. Machine
            </h4>
            <ul className="space-y-1.5 text-gray-700">
              <li><span className="text-gray-500 font-medium">Machine ID:</span> <span className="font-bold text-gray-900">{session.context?.machineId || 'MC-014'}</span></li>
              <li><span className="text-gray-500 font-medium">Machine Type:</span> Fabric Inspection Machine</li>
              <li><span className="text-gray-500 font-medium">Machine Settings:</span> Standard Profile (1.2N)</li>
              <li><span className="text-gray-500 font-medium">Machine Speed:</span> 28 m/min</li>
              <li><span className="text-gray-500 font-medium">Temperature:</span> 24°C</li>
              <li><span className="text-gray-500 font-medium">Vibration:</span> Normal (0.02g)</li>
              <li><span className="text-gray-500 font-medium">Error Logs:</span> None</li>
              <li><span className="text-gray-500 font-medium">Recent Adjustment:</span> <span className="font-bold text-emerald-700">Yes</span></li>
            </ul>
          </div>

          {/* B. MAINTENANCE */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-600" /> B. Maintenance
            </h4>
            <ul className="space-y-1.5 text-gray-700">
              <li><span className="text-gray-500 font-medium">Last Service Date:</span> 2026-08-20</li>
              <li><span className="text-gray-500 font-medium">Fault History:</span> 1 sensor error (Resolved)</li>
              <li><span className="text-gray-500 font-medium">Lubrication Record:</span> Completed 2026-08-28</li>
              <li><span className="text-gray-500 font-medium">Replaced Parts:</span> Tension Roller Bearing</li>
              <li><span className="text-gray-500 font-medium">Unresolved Alerts:</span> <span className="font-bold text-emerald-700">None</span></li>
            </ul>
          </div>

          {/* C. OPERATIONS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" /> C. Operations
            </h4>
            <ul className="space-y-1.5 text-gray-700">
              <li><span className="text-gray-500 font-medium">Production Line:</span> <span className="font-bold text-gray-900">{session.context?.lineId || 'LINE-03'}</span></li>
              <li><span className="text-gray-500 font-medium">Timestamp:</span> {session.timestamp || '2026-09-02 09:02'}</li>
              <li><span className="text-gray-500 font-medium">Shift:</span> <span className="font-semibold text-gray-900">{session.context?.shift || 'SHIFT-A'}</span></li>
              <li><span className="text-gray-500 font-medium">Inspection Point:</span> {session.context?.inspectionPoint || 'FABRIC_QC'}</li>
              <li><span className="text-gray-500 font-medium">Operator Ref:</span> {session.context?.operatorRef || 'OP-ANON-021'}</li>
            </ul>
          </div>

          {/* D. MATERIAL */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-600" /> D. Material
            </h4>
            <ul className="space-y-1.5 text-gray-700">
              <li><span className="text-gray-500 font-medium">Fabric Type:</span> Cotton Single Jersey</li>
              <li>
                <span className="text-gray-500 font-medium">Yarn Batch ID:</span>{' '}
                <span className="font-semibold text-gray-800">{session.additional_context?.yarnBatchId || 'YB-8821'}</span>
              </li>
              <li>
                <span className="text-gray-500 font-medium">Dye Batch ID:</span>{' '}
                <span className="font-semibold text-gray-800">{session.additional_context?.dyeBatchId || 'DB-9012'}</span>
              </li>
              <li><span className="text-gray-500 font-medium">Roll ID:</span> <span className="font-bold text-blue-700">{session.context?.rollId || 'ROLL-2026-104'}</span></li>
              <li>
                <span className="text-gray-500 font-medium">Supplier ID:</span>{' '}
                <span className="font-semibold text-gray-800">{session.additional_context?.supplierId || 'SUP-TEX-04'}</span>
              </li>
              <li><span className="text-gray-500 font-medium">Production Batch:</span> {session.context?.batchId || 'PB-4021'}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 6. COMMON PROBABLE CAUSE INVESTIGATION (EVENT LEVEL) */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="border-b pb-3 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Probable Causes – Human Confirmation Required
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ranked model hypotheses for defect class <strong className="text-blue-700 font-bold">{session.defect_class}</strong>. Strictly requires human confirmation.
            </p>
          </div>

          <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded border border-amber-200">
            Defect Hypothesis Model Output
          </span>
        </div>

        <div className="space-y-4">
          {activeProbableCauses.map((cause) => {
            const currentReview = causeReviews[cause.id];
            return (
              <div 
                key={cause.id} 
                className={`p-4 rounded-xl border transition ${
                  currentReview === 'Relevant' 
                    ? 'bg-emerald-50/70 border-emerald-300' 
                    : currentReview === 'Not Relevant' 
                      ? 'bg-red-50/70 border-red-300' 
                      : currentReview === 'Insufficient Evidence' 
                        ? 'bg-amber-50/70 border-amber-300' 
                        : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded">
                      Rank {cause.rank}
                    </span>
                    <h4 className="font-bold text-sm text-gray-900">{cause.probableCause}</h4>
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                    currentReview === 'Relevant'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : currentReview === 'Not Relevant'
                        ? 'bg-red-600 text-white border-red-600'
                        : currentReview === 'Insufficient Evidence'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-600 border-gray-300'
                  }`}>
                    Review: {currentReview || 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
                  <div className="bg-white p-2.5 rounded border border-gray-200">
                    <span className="font-bold text-gray-700 block mb-0.5">Supporting Evidence:</span>
                    <span className="text-gray-600">{cause.supportingEvidence}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded border border-gray-200">
                    <span className="font-bold text-gray-700 block mb-0.5">Missing Evidence:</span>
                    <span className="text-gray-600">{cause.missingEvidence}</span>
                  </div>
                </div>

                {/* 7. COMMON HUMAN CAUSE REVIEW CONTROLS FOR THIS CAUSE */}
                <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="font-semibold text-gray-700">Set Human Cause Review Decision:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCauseReviewSelect(cause.id, 'Relevant')}
                      className={`px-3 py-1.5 rounded-md font-bold text-xs transition border flex items-center gap-1 ${
                        currentReview === 'Relevant'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Relevant
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCauseReviewSelect(cause.id, 'Not Relevant')}
                      className={`px-3 py-1.5 rounded-md font-bold text-xs transition border flex items-center gap-1 ${
                        currentReview === 'Not Relevant'
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Not Relevant
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCauseReviewSelect(cause.id, 'Insufficient Evidence')}
                      className={`px-3 py-1.5 rounded-md font-bold text-xs transition border flex items-center gap-1 ${
                        currentReview === 'Insufficient Evidence'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Insufficient Evidence
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8. COMMON CORRECTIVE ACTION AND NOTES */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> Corrective Action and Review Notes
          </h3>
          <p className="text-xs text-gray-500">Document human quality decisions and recommended corrective actions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-gray-700 font-semibold mb-1.5">Corrective Action</label>
            <textarea
              rows={4}
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Enter the corrective action taken or recommended for this defect event (e.g., Clean bearing seals on MC-014; inspect warp roller alignment)."
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1.5">Review Notes</label>
            <textarea
              rows={4}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add supporting observations or investigation notes."
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 9. BOTTOM ACTIONS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-end gap-3">
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Generate Report
          </button>

          <button 
            type="button"
            onClick={handleSaveAction}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Action
          </button>
        </div>
      </div>

      {/* REPORT SUMMARY MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-gray-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> Defect Event Investigation Report
                </h3>
                <p className="text-xs text-gray-500">Formal summary of defect evidence, context, and cause reviews.</p>
              </div>
              <button 
                onClick={() => setShowReportModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div><span className="text-gray-500">Event ID:</span> <strong className="text-gray-900">{session.event_id}</strong></div>
                <div><span className="text-gray-500">Entry Mode:</span> <strong className="text-blue-700">{entryType}</strong></div>
                <div><span className="text-gray-500">Factory / Line:</span> <strong>{session.context?.factoryId} / {session.context?.lineId}</strong></div>
                <div><span className="text-gray-500">Defect Class:</span> <strong className="text-amber-600">{session.defect_class} ({session.confidence}%)</strong></div>
              </div>

              <div>
                <strong className="block text-gray-800 mb-1">Human Cause Review Decisions:</strong>
                <ul className="space-y-1 text-gray-700 pl-2 border-l-2 border-blue-400">
                  {activeProbableCauses.map(c => (
                    <li key={c.id}>
                      <span className="font-semibold">Rank {c.rank} ({c.probableCause}):</span>{' '}
                      <span className="font-bold text-blue-700">{causeReviews[c.id] || 'Pending Human Review'}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {correctiveAction && (
                <div>
                  <strong className="block text-gray-800 mb-0.5">Documented Corrective Action:</strong>
                  <p className="p-2 bg-white rounded border text-gray-700">{correctiveAction}</p>
                </div>
              )}

              {reviewNotes && (
                <div>
                  <strong className="block text-gray-800 mb-0.5">QC Reviewer Notes:</strong>
                  <p className="p-2 bg-white rounded border text-gray-700">{reviewNotes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t pt-3">
              <button 
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  window.print();
                  setShowReportModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow hover:bg-blue-700 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
