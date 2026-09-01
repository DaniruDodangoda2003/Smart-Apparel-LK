import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import { loadLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import { ArrowLeft, AlertTriangle, Image as ImageIcon, Upload, Search, Activity, Flag, Save, FileText } from 'lucide-react';

export default function C1ImageInspection() {
  const [c1State] = useState(() => loadLocal('smartapparel.c1.state', { defaultModel: 'model_yolov8n' }));
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event') || '';
  const modelId = searchParams.get('model') || c1State.defaultModel;
  const navigate = useNavigate();

  const [selectedEventId, setSelectedEventId] = useState(eventId);
  const [inspections, setInspections] = useState([]);
  const [detections, setDetections] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedModel, setSelectedModel] = useState(modelId);
  const [isInspected, setIsInspected] = useState(false);
  const [flagIncorrect, setFlagIncorrect] = useState(false);
  const [feedback, setFeedback] = useState({ class: false, box: false, explanation: false, note: '' });
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      const [insps, dets, evals] = await Promise.all([
        loadDemoJson('c1/inspections.json'),
        loadDemoJson('c1/detections.json').catch(() => []),
        loadDemoJson('c1/model_evaluations.json').catch(() => [])
      ]);
      setInspections(insps);
      setDetections(dets);
      setEvaluations(evals);
    };
    fetchData();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsInspected(false);
      setFlagIncorrect(false);
    }
  };

  const handleRunInspection = () => {
    if (!previewUrl && !selectedEventId) {
      alert("Please select an event or upload an image first.");
      return;
    }
    setIsInspected(true);
  };

  const selectedDetection = detections.find(d => d.inspection_id === selectedEventId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c1')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <PageHeader title="Fabric Image Inspection" description="Manual image inspection with model inference visualization." />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
          <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
          </div>
          <p className="italic">Not a live production recommendation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-6 shadow-sm">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Inspection Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500"
            >
              {evaluations.map(m => (
                <option key={m.id} value={m.id}>{m.name} {m.id === c1State.defaultModel ? '(Default)' : ''}</option>
              ))}
              {evaluations.length === 0 && <option value="model_yolov8n">YOLOv8n (Default)</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Demo Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => { setSelectedEventId(e.target.value); setIsInspected(false); setFlagIncorrect(false); }}
              className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Select Event --</option>
              {inspections.map(insp => (
                <option key={insp.inspection_id} value={insp.inspection_id}>
                  {insp.inspection_id} (Roll: {insp.roll_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Local Image</label>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" /> Choose Image File
            </button>
          </div>

          <button 
            onClick={handleRunInspection}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow flex justify-center items-center gap-2"
          >
            <Search className="w-5 h-5" /> Run Inspection
          </button>
          
          <div className="p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-200 text-xs">
            <p className="font-bold">Physical Verification Required</p>
            <p className="italic bg-orange-100 p-2 rounded mt-2">Outputs are DEMO_PRECOMPUTED. No live model inference is run in this prototype.</p>
          </div>
        </div>

        {/* Preview Area */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-slate-100 rounded-xl border border-gray-200 flex items-center justify-center min-h-[400px] relative overflow-hidden shadow-inner">
            {previewUrl || selectedEventId ? (
              <>
                {/* Simulated Image */}
                <div className="w-full h-full min-h-[400px] bg-slate-300 flex items-center justify-center relative">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Fabric Preview" className="absolute max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-gray-500 font-bold">Simulated Fabric Surface for {selectedEventId}</div>
                  )}
                  
                  {isInspected && selectedDetection && selectedDetection.bounding_boxes?.map((box, i) => (
                    <div 
                      key={i}
                      className="absolute border-2 border-red-500 bg-red-500/20"
                      style={{
                        left: `${box.x}px`,
                        top: `${box.y}px`,
                        width: `${box.w}px`,
                        height: `${box.h}px`
                      }}
                    >
                      <span className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                        {box.label} ({(selectedDetection.confidence * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Upload an image or select an event.</p>
              </div>
            )}
          </div>

          {isInspected && selectedDetection && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">Defect Class</p>
                  <p className="font-bold text-gray-900">{selectedDetection.defect_class}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Confidence</p>
                  <p className="font-bold text-gray-900">{(selectedDetection.confidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Selected Model</p>
                  <p className="font-bold text-blue-600">{evaluations.find(m => m.id === selectedModel)?.name || selectedModel}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Bounding Boxes</p>
                  <p className="font-bold text-gray-900">{selectedDetection.bounding_boxes?.length || 0}</p>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900 space-y-2">
                <p className="font-bold flex items-center gap-1"><Activity className="w-4 h-4" /> XAI / Model-Focus Evidence</p>
                <p>{selectedDetection.xai_evidence}</p>
                <div className="mt-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded inline-block">
                  <AlertTriangle className="w-3 h-3 inline mr-1" /> Warning: Model focus does not prove physical defect cause.
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {selectedEventId && (
                  <>
                    <button onClick={() => navigate(`/c1/event/${selectedEventId}`)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-sm font-medium">
                      <FileText className="w-4 h-4 text-gray-600" /> View Defect Details
                    </button>
                    <button onClick={() => navigate(`/c1/event/${selectedEventId}`)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-sm font-medium">
                      <Search className="w-4 h-4 text-blue-600" /> Investigate Probable Causes
                    </button>
                  </>
                )}
                
                <button onClick={() => setFlagIncorrect(!flagIncorrect)} className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded text-sm font-medium">
                  <Flag className="w-4 h-4" /> Flag Incorrect Result
                </button>
                <button onClick={() => alert('Inspection saved to demo history.')} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium ml-auto">
                  <Save className="w-4 h-4" /> Save Inspection
                </button>
              </div>

              {flagIncorrect && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                  <p className="font-bold text-orange-800 mb-2">Flag Incorrect Result</p>
                  <div className="space-y-2 mb-3">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={feedback.class} onChange={e => setFeedback({...feedback, class: e.target.checked})} /> Incorrect Defect Class</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={feedback.box} onChange={e => setFeedback({...feedback, box: e.target.checked})} /> Incorrect Bounding Box</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={feedback.explanation} onChange={e => setFeedback({...feedback, explanation: e.target.checked})} /> Incorrect XAI Explanation</label>
                  </div>
                  <textarea 
                    placeholder="Feedback Note..." 
                    className="w-full border rounded p-2 text-sm mb-2"
                    value={feedback.note}
                    onChange={e => setFeedback({...feedback, note: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setFlagIncorrect(false); alert('Feedback submitted.'); }} className="px-3 py-1 bg-orange-600 text-white rounded font-bold text-xs">Submit Feedback</button>
                    <button onClick={() => setFlagIncorrect(false)} className="px-3 py-1 bg-gray-200 text-gray-800 rounded font-bold text-xs">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isInspected && !selectedDetection && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              No precomputed image-analysis asset is available for this demo inspection.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
