import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import { ArrowLeft, AlertTriangle, Video, Upload } from 'lucide-react';

export default function C1VideoInspection() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event') || '';
  const navigate = useNavigate();

  const [selectedEventId, setSelectedEventId] = useState(eventId);
  const [inspections, setInspections] = useState([]);
  const [mediaOutputs, setMediaOutputs] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      const [insps, media] = await Promise.all([
        loadDemoJson('c1/inspections.json'),
        loadDemoJson('c1/media_outputs.json').catch(() => [])
      ]);
      setInspections(insps);
      setMediaOutputs(media);
    };
    fetchData();
  }, []);

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const selectedOutput = mediaOutputs.find(m => m.inspection_id === selectedEventId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c1')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <PageHeader title="Fabric Video Inspection" description="Upload and review fabric video recordings." />
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Local Video</label>
            <input 
              type="file" 
              accept="video/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleVideoUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-purple-400 transition-colors"
            >
              <Upload className="w-4 h-4" /> Choose Video File
            </button>
          </div>

          {selectedOutput && selectedOutput.video_analysis_available ? (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-900 space-y-2">
              <p className="font-bold flex items-center gap-1"><Video className="w-4 h-4" /> Demo / Precomputed Output</p>
              <p className="text-xs">{selectedOutput.demo_notes || 'Precomputed analysis output available for this event.'}</p>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              No precomputed video-analysis output is available for this inspection.
            </div>
          )}
          
          <div className="p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-200 text-xs space-y-2">
            <p className="font-bold">Physical Verification Required</p>
            <p>Physical verification is required before recording a confirmed finding.</p>
            <p className="italic bg-orange-100 p-2 rounded">Uploaded video is used only for preview. No live video inference is performed.</p>
          </div>
        </div>

        {/* Preview Area */}
        <div className="md:col-span-2 bg-slate-900 rounded-xl border border-gray-200 flex items-center justify-center min-h-[400px] overflow-hidden">
          {previewUrl ? (
            <video src={previewUrl} controls className="w-full h-full object-contain bg-black" />
          ) : (
            <div className="text-center text-gray-500">
              <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Upload a video to preview.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
