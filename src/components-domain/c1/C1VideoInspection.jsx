import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import { loadLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import { ArrowLeft, AlertTriangle, Video, Upload, Play, Pause, Square, Search, FastForward, Save, Eye } from 'lucide-react';

export default function C1VideoInspection() {
  const [c1State] = useState(() => loadLocal('smartapparel.c1.state', { defaultModel: 'model_yolov8n' }));
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event') || '';
  const modelId = searchParams.get('model') || c1State.defaultModel;
  const navigate = useNavigate();

  const [selectedEventId, setSelectedEventId] = useState(eventId);
  const [inspections, setInspections] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedModel, setSelectedModel] = useState(modelId);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      const [insps, evals] = await Promise.all([
        loadDemoJson('c1/inspections.json'),
        loadDemoJson('c1/model_evaluations.json').catch(() => [])
      ]);
      setInspections(insps);
      setEvaluations(evals);
    };
    fetchData();
  }, []);

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setAnalysisComplete(false);
      setIsAnalyzing(false);
      setCurrentFrame(0);
    }
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
    if (!previewUrl && !selectedEventId) {
      alert("Please select an event or upload a video first.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    
    // Simulate analysis delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisComplete(true);
    }, 2000);
  };

  const handleStopAnalysis = () => {
    setIsAnalyzing(false);
  };

  // Precomputed grouped defect events per the requirement
  const groupedEvents = [
    {
      id: "EVT-V-001",
      defect: "Stain",
      confidence: 0.94,
      firstSeen: 201,
      lastSeen: 204,
      observedFrames: 4,
      status: "CONFIRMED"
    },
    {
      id: "EVT-V-002",
      defect: "Yarn Break",
      confidence: 0.88,
      firstSeen: 505,
      lastSeen: 505,
      observedFrames: 1,
      status: "PENDING"
    }
  ];

  const handleNextDefect = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 201 / 30; // Jump to roughly frame 201 assuming 30 FPS
      setCurrentFrame(201);
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      setCurrentFrame(201);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c1')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <PageHeader title="Fabric Video Inspection" description="Review controlled recorded-video demonstrations." />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
          <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
          </div>
          <p className="italic font-bold text-red-600">Not a live production camera inference</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-6 shadow-sm col-span-1">
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
              onChange={(e) => { setSelectedEventId(e.target.value); setAnalysisComplete(false); }}
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
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" /> Choose Video File
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200 space-y-2">
            {!isAnalyzing && !analysisComplete && (
              <button onClick={handleStartAnalysis} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow flex justify-center items-center gap-2">
                <Search className="w-4 h-4" /> Start Analysis
              </button>
            )}
            {isAnalyzing && (
              <button onClick={handleStopAnalysis} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow flex justify-center items-center gap-2">
                <Square className="w-4 h-4" /> Stop Analysis
              </button>
            )}
            {analysisComplete && (
              <>
                <button onClick={handleNextDefect} className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded flex justify-center items-center gap-2">
                  <FastForward className="w-4 h-4" /> Next Defect Event
                </button>
                <button onClick={() => alert('Analysis saved to demo history.')} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 font-bold rounded flex justify-center items-center gap-2">
                  <Save className="w-4 h-4" /> Save Analysis
                </button>
              </>
            )}
          </div>
          
          <div className="p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-200 text-xs mt-4">
            <p className="font-bold">Demonstration Only</p>
            <p className="italic mt-1">This screen replays a controlled recorded-video demonstration. ML analysis results remain deterministic DEMO_PRECOMPUTED.</p>
          </div>
        </div>

        {/* Video & Results Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900 rounded-xl border border-gray-800 flex flex-col min-h-[400px] overflow-hidden">
            <div className="flex-1 relative flex items-center justify-center">
              {previewUrl ? (
                <video 
                  ref={videoRef} 
                  src={previewUrl} 
                  className="w-full h-full object-contain bg-black" 
                  onTimeUpdate={(e) => setCurrentFrame(Math.floor(e.target.currentTime * 30))}
                  onEnded={() => setIsPlaying(false)}
                />
              ) : (
                <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full min-h-[400px]">
                  <Video className="w-12 h-12 mb-2 opacity-50" />
                  <p>Upload a video or select an event to preview.</p>
                  {analysisComplete && (
                    <div className="mt-4 p-4 border border-blue-500 bg-blue-900/30 rounded">
                      <p className="text-blue-400 font-bold">Simulated Video Frame: {currentFrame}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Player Bar */}
            <div className="bg-slate-800 p-3 flex items-center gap-4 text-slate-300">
              <button onClick={handlePlayPause} className="hover:text-white">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <div className="flex-1 bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{width: `${(currentFrame / 900) * 100}%`}}></div>
              </div>
              <div className="text-xs font-mono">Frame: {currentFrame}</div>
            </div>
          </div>

          {/* Analysis Panel */}
          {analysisComplete && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Precomputed Metrics Panel */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-800 border-b pb-2 mb-3">Precomputed Analysis Panel</h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <div><span className="text-gray-500">Current Frame:</span> <span className="font-bold">{currentFrame}</span></div>
                  <div><span className="text-gray-500">Timestamp:</span> <span className="font-bold">{(currentFrame/30).toFixed(2)}s</span></div>
                  <div><span className="text-gray-500">Selected Model:</span> <span className="font-bold text-blue-600">{evaluations.find(m => m.id === selectedModel)?.name || selectedModel}</span></div>
                  <div><span className="text-gray-500">Input Video FPS:</span> <span className="font-bold">30</span></div>
                  <div><span className="text-gray-500">Processing FPS:</span> <span className="font-bold text-green-600">35</span></div>
                  <div><span className="text-gray-500">Median Latency:</span> <span className="font-bold">25ms</span></div>
                  <div><span className="text-gray-500">P95 Latency:</span> <span className="font-bold">32ms</span></div>
                  <div><span className="text-gray-500">XAI Gen Time:</span> <span className="font-bold">12ms</span></div>
                </div>
                {currentFrame >= 201 && currentFrame <= 204 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-900 text-sm">
                     <p className="font-bold">Detecting: Stain (Conf: 94.0%)</p>
                  </div>
                )}
              </div>

              {/* Grouped Event Table */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-800 border-b pb-2 mb-3">Grouped Defect Events</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 border-b">
                        <th className="p-2 font-medium">Event ID</th>
                        <th className="p-2 font-medium">Defect</th>
                        <th className="p-2 font-medium">Conf</th>
                        <th className="p-2 font-medium">Frames</th>
                        <th className="p-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedEvents.map(evt => (
                        <tr key={evt.id} className="border-b">
                          <td className="p-2 font-bold text-gray-800">{evt.id}</td>
                          <td className="p-2">{evt.defect}</td>
                          <td className="p-2">{(evt.confidence * 100).toFixed(0)}%</td>
                          <td className="p-2">{evt.firstSeen}-{evt.lastSeen} ({evt.observedFrames})</td>
                          <td className="p-2">
                            <button onClick={() => navigate(`/c1/event/${selectedEventId || 'INSP-0001'}`)} className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
