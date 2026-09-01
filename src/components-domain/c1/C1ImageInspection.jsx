import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import { ArrowLeft, AlertTriangle, Image as ImageIcon, Upload } from 'lucide-react';

export default function C1ImageInspection() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event') || '';
  const navigate = useNavigate();

  const [selectedEventId, setSelectedEventId] = useState(eventId);
  const [inspections, setInspections] = useState([]);
  const [detections, setDetections] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      const [insps, dets] = await Promise.all([
        loadDemoJson('c1/inspections.json'),
        loadDemoJson('c1/detections.json').catch(() => [])
      ]);
      setInspections(insps);
      setDetections(dets);
    };
    fetchData();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const selectedDetection = detections.find(d => d.inspection_id === selectedEventId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c1')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <PageHeader title="Fabric Image Inspection" description="Upload and review fabric images with precomputed analysis overlays." />
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Inspection Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
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
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-blue-400 transition-colors"
            >
              <Upload className="w-4 h-4" /> Choose Image File
            </button>
          </div>

          {selectedDetection ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 space-y-2">
              <p className="font-bold flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Demo / Precomputed Output</p>
              <p className="text-xs">Precomputed analysis asset available for this inspection event.</p>
              <div className="mt-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded">
                <AlertTriangle className="w-3 h-3 inline mr-1" /> {selectedDetection.explanation || 'Model focus area — not proof of physical defect cause.'}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              No precomputed image-analysis asset is available for this inspection.
            </div>
          )}
          
          <div className="p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-200 text-xs">
            <p className="font-bold">Physical Verification Required</p>
            <p className="mt-1 mb-2">Image preview does not represent live model inference. Quality team verification is required before confirming a defect.</p>
            <p className="italic bg-orange-100 p-2 rounded">Uploaded media is used only for interface demonstration. The displayed overlay is a fixed precomputed output associated with the selected demo inspection and is not generated from the uploaded file.</p>
          </div>
        </div>

        {/* Preview Area */}
        <div className="md:col-span-2 bg-slate-100 rounded-xl border border-gray-200 flex items-center justify-center min-h-[400px] relative overflow-hidden">
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Fabric Preview" className="max-w-full max-h-full object-contain" />
              {/* Overlay fixed demo boxes if detection exists */}
              {selectedDetection && selectedDetection.bounding_boxes?.map((box, i) => (
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
                  <span className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                    {box.label}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center text-gray-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Upload an image to preview.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
