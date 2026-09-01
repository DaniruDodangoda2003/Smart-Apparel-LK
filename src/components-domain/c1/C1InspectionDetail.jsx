import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import { loadLocal, saveLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { ArrowLeft, AlertTriangle, CheckCircle, FileText, Activity, Bell, Check, X, HelpCircle, Save } from 'lucide-react';

export default function C1InspectionDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions, setSavedActions } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [inspection, setInspection] = useState(null);
  const [detection, setDetection] = useState(null);
  const [explanation, setExplanation] = useState(null);

  const [c1State, setC1State] = useState(() => loadLocal('smartapparel.c1.state', { defaultModel: 'model_yolov8n', reviews: {}, overrides: {} }));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [insps, dets, exps] = await Promise.all([
          loadDemoJson('c1/inspections.json'),
          loadDemoJson('c1/detections.json').catch(() => []),
          loadDemoJson('c1/explanations.json').catch(() => [])
        ]);
        const insp = insps.find(i => i.inspection_id === eventId);
        
        if (!insp) {
          throw new Error('Inspection event not found in current demo fixture.');
        }
        setInspection(insp);
        setDetection(dets.find(d => d.inspection_id === eventId) || null);
        setExplanation(exps.find(e => e.inspection_id === eventId) || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  if (loading) return <LoadingState message="Loading Inspection Details..." />;
  if (error) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <ErrorState title="Failed to load inspection" message={error} />
      <button onClick={() => navigate('/c1')} className="text-blue-600 hover:underline flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to C1 Workspace</button>
    </div>
  );

  const reviewState = c1State.reviews[eventId] || { causes: {}, notes: '', correctiveAction: '' };

  const handleReviewChange = (field, value) => {
    const updatedState = {
      ...c1State,
      reviews: {
        ...c1State.reviews,
        [eventId]: {
          ...reviewState,
          [field]: value
        }
      }
    };
    setC1State(updatedState);
    saveLocal('smartapparel.c1.state', updatedState);
  };
  
  const handleCauseReview = (causeRank, action) => {
    const updatedState = {
      ...c1State,
      reviews: {
        ...c1State.reviews,
        [eventId]: {
          ...reviewState,
          causes: {
            ...reviewState.causes,
            [causeRank]: action
          }
        }
      }
    };
    setC1State(updatedState);
    saveLocal('smartapparel.c1.state', updatedState);
  };

  const handleCreateReviewAction = () => {
    const actionType = 'QUALITY_REVIEW';
    const exists = savedActions.some(a => 
      a.component_id === 'C1' && 
      a.entity_id === inspection.inspection_id && 
      a.action_type === actionType &&
      a.status !== 'COMPLETED' && 
      a.status !== 'CANCELLED'
    );

    if (!exists) {
      const newAction = {
        id: `ACT-${Date.now()}`,
        component_id: 'C1',
        run_id: null,
        entity_type: 'inspection',
        entity_id: inspection.inspection_id,
        action_type: actionType,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        action_route: `/c1/event/${inspection.inspection_id}`
      };
      setSavedActions([newAction, ...savedActions]);
      alert('Review action created successfully.');
    } else {
      alert('Review action already exists for this event.');
    }
  };

  const matchedAlert = globalAlerts.find(a => a.component_id === 'C1' && a.entity_id === inspection.roll_id);
  const handleAcknowledge = () => {
    if (matchedAlert) {
      updateAlert(matchedAlert.alert_id, 'ACKNOWLEDGED');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c1')} className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <PageHeader title={`Event Details: ${inspection.inspection_id}`} description="Investigate probable causes and confirm defect details." />
        </div>
        <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
          <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
          </div>
          <p className="italic">Not a live production recommendation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Visuals & Context */}
        <div className="space-y-6">
          {/* Event Summary & Visuals */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" /> Event Summary
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><p className="text-gray-500">Roll ID</p><p className="font-bold text-gray-900">{inspection.roll_id}</p></div>
              <div>
                <p className="text-gray-500">Status</p>
                <span className={`px-2 py-1 rounded text-xs font-bold ${inspection.status === 'DEFECTIVE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {inspection.status}
                </span>
              </div>
              {detection && (
                <>
                  <div><p className="text-gray-500">Defect Class</p><p className="font-bold text-gray-900">{detection.defect_class}</p></div>
                  <div><p className="text-gray-500">Confidence</p><p className="font-bold text-gray-900">{(detection.confidence * 100).toFixed(1)}%</p></div>
                </>
              )}
            </div>

            <div className="bg-slate-100 rounded-lg h-64 border flex items-center justify-center relative overflow-hidden">
              <div className="text-center text-gray-400">
                 <p className="font-bold text-gray-500">Representative Frame</p>
                 <p className="text-xs">Visual demonstration</p>
              </div>
              {detection && detection.bounding_boxes?.map((box, i) => (
                <div 
                  key={i}
                  className="absolute border-2 border-red-500 bg-red-500/20"
                  style={{
                    left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`
                  }}
                >
                  <span className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-bold px-1 py-0.5 rounded whitespace-nowrap">
                    {box.label}
                  </span>
                </div>
              ))}
            </div>
            
            {detection && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900 space-y-1">
                <p className="font-bold">XAI / Model-Focus Evidence</p>
                <p>{detection.xai_evidence}</p>
                <div className="mt-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded inline-block">
                  <AlertTriangle className="w-3 h-3 inline mr-1" /> Model focus does not prove physical defect cause.
                </div>
              </div>
            )}
          </div>

          {/* Factory Metadata */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" /> Factory Context
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 text-sm">
              <div>
                <h4 className="font-bold text-gray-700 mb-1 border-b pb-1">Machine</h4>
                {inspection.metadata?.machine ? (
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li><span className="font-medium">Model:</span> {inspection.metadata.machine.model}</li>
                    <li><span className="font-medium">Calibration:</span> {inspection.metadata.machine.last_calibration}</li>
                  </ul>
                ) : <span className="text-gray-400 italic text-xs">No data</span>}
              </div>
              <div>
                <h4 className="font-bold text-gray-700 mb-1 border-b pb-1">Maintenance</h4>
                {inspection.metadata?.maintenance ? (
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li><span className="font-medium">Status:</span> {inspection.metadata.maintenance.status}</li>
                    <li><span className="font-medium">Notes:</span> {inspection.metadata.maintenance.last_service_notes}</li>
                  </ul>
                ) : <span className="text-gray-400 italic text-xs">No data</span>}
              </div>
              <div>
                <h4 className="font-bold text-gray-700 mb-1 border-b pb-1">Operations</h4>
                {inspection.metadata?.operations ? (
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li><span className="font-medium">Shift:</span> {inspection.metadata.operations.shift}</li>
                    <li><span className="font-medium">Speed:</span> {inspection.metadata.operations.speed}</li>
                  </ul>
                ) : <span className="text-gray-400 italic text-xs">No data</span>}
              </div>
              <div>
                <h4 className="font-bold text-gray-700 mb-1 border-b pb-1">Material</h4>
                {inspection.metadata?.material ? (
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li><span className="font-medium">Supplier:</span> {inspection.metadata.material.supplier}</li>
                    <li><span className="font-medium">Lot:</span> {inspection.metadata.material.lot_number}</li>
                  </ul>
                ) : <span className="text-gray-400 italic text-xs">No data</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Probable Causes & Review */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2 mb-4">
            Probable Causes — Human Confirmation Required
          </h3>
          
          <div className="flex-1 space-y-6">
            {explanation && explanation.probable_causes?.length > 0 ? (
              explanation.probable_causes.map(pc => {
                const currentStatus = reviewState.causes[pc.rank];
                return (
                  <div key={pc.rank} className={`p-4 border rounded-lg ${currentStatus === 'Relevant' ? 'bg-green-50 border-green-200' : currentStatus === 'Not Relevant' ? 'bg-red-50 border-red-200' : currentStatus === 'Insufficient Evidence' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-gray-900 text-sm">#{pc.rank} {pc.cause}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-white border rounded">Status: {currentStatus || pc.review_status}</span>
                    </div>
                    <div className="text-xs space-y-1 mb-3">
                      <p><span className="font-medium text-gray-600">Supporting:</span> {pc.supporting_evidence}</p>
                      <p><span className="font-medium text-gray-600">Missing:</span> {pc.missing_evidence}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleCauseReview(pc.rank, 'Relevant')} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${currentStatus === 'Relevant' ? 'bg-green-600 text-white' : 'bg-white text-green-700 border-green-300'}`}><Check className="w-3 h-3" /> Relevant</button>
                      <button onClick={() => handleCauseReview(pc.rank, 'Not Relevant')} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${currentStatus === 'Not Relevant' ? 'bg-red-600 text-white' : 'bg-white text-red-700 border-red-300'}`}><X className="w-3 h-3" /> Not Relevant</button>
                      <button onClick={() => handleCauseReview(pc.rank, 'Insufficient Evidence')} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${currentStatus === 'Insufficient Evidence' ? 'bg-orange-500 text-white' : 'bg-white text-orange-600 border-orange-300'}`}><HelpCircle className="w-3 h-3" /> Insufficient Evidence</button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 bg-orange-50 text-orange-800 rounded border border-orange-200 text-sm">
                No precomputed probable causes available.
              </div>
            )}

            <div className="space-y-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Review Notes</label>
                <textarea 
                  value={reviewState.notes}
                  onChange={(e) => handleReviewChange('notes', e.target.value)}
                  placeholder="Enter human review notes..."
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Corrective Action</label>
                <textarea 
                  value={reviewState.correctiveAction}
                  onChange={(e) => handleReviewChange('correctiveAction', e.target.value)}
                  placeholder="Enter corrective action taken..."
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t flex flex-wrap gap-3 mt-4">
            <button onClick={() => alert('Review saved locally.')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700">
              <Save className="w-4 h-4" /> Save Review
            </button>
            <button onClick={handleCreateReviewAction} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
              Create Review Action
            </button>
            {matchedAlert && matchedAlert.status === 'OPEN' && (
              <button onClick={handleAcknowledge} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50">
                <CheckCircle className="w-4 h-4 text-green-600" /> Acknowledge Alert
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
