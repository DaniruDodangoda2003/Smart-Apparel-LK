import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import { loadLocal, saveLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { ArrowLeft, AlertTriangle, CheckCircle, FileText, Activity, Bell } from 'lucide-react';

export default function C1InspectionDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions, setSavedActions } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [inspection, setInspection] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [insps, exps] = await Promise.all([
          loadDemoJson('c1/inspections.json'),
          loadDemoJson('c1/explanations.json').catch(() => [])
        ]);
        const insp = insps.find(i => i.inspection_id === eventId);
        
        if (!insp) {
          throw new Error('Inspection event not found in current demo fixture.');
        }
        setInspection({
          ...insp,
          explanation: exps.find(e => e.inspection_id === eventId) || null
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const [c1State, setC1State] = useState(() => loadLocal('smartapparel.c1.state', { reviews: {}, acknowledgements: {} }));

  if (loading) return <LoadingState message="Loading Inspection Details..." />;
  if (error) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <ErrorState title="Failed to load inspection" message={error} />
      <button onClick={() => navigate('/c1')} className="text-blue-600 hover:underline flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to C1 Workspace</button>
    </div>
  );

  const reviewState = c1State.reviews[eventId] || { humanCause: '', correctiveAction: '' };

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
  const matchedAlert = globalAlerts.find(a => a.component_id === 'C1' && a.entity_id === inspection.roll_id);

  const handleAcknowledge = () => {
    if (matchedAlert) {
      updateAlert(matchedAlert.alert_id, 'ACKNOWLEDGED');
    }
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

  const ProvenanceBadge = () => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      <p className="italic">Not a live production recommendation</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c1')} className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <PageHeader title={`Inspection Details: ${inspection.inspection_id}`} description="Recorded quality inspection event details." />
        </div>
        <ProvenanceBadge />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Core details */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4 shadow-sm">
          <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" /> Record Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Event ID</p>
              <p className="font-semibold text-gray-900">{inspection.inspection_id}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Roll ID</p>
              <p className="font-semibold text-gray-900">{inspection.roll_id}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Recorded Quality Status</p>
              <span className={`px-2 py-1 rounded text-xs font-bold ${inspection.status === 'DEFECTIVE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {inspection.status}
              </span>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Recorded Events</p>
              <p className="font-semibold text-gray-900">{inspection.events}</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t space-y-2 text-sm">
            <p className="text-gray-500 font-medium">Additional Information</p>
            <div className="grid grid-cols-2 gap-y-2 text-gray-400 italic">
              <p>Factory ID: Not available in the current demo fixture.</p>
              <p>Batch ID: Not available in the current demo fixture.</p>
              <p>Order/Style ID: Not available in the current demo fixture.</p>
              <p>Inspection Date: Not available in the current demo fixture.</p>
              <p>Operator ID: Not available in the current demo fixture.</p>
              <p>Fabric Information: Not available in the current demo fixture.</p>
              <p>Defect Categories: Not available in the current demo fixture.</p>
              <p>Affected Area: Not available in the current demo fixture.</p>
              <p>Severity: Not available in the current demo fixture.</p>
              <p>Notes: Not available in the current demo fixture.</p>
            </div>
          </div>
        </div>

        {/* Quality Review Section */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-500" /> Quality Review
          </h3>
          <div className="flex-1 space-y-4">
            <div className="p-4 bg-gray-50 rounded border border-gray-200 text-sm">
              <p className="font-medium text-gray-700 mb-1">Recorded inspection finding</p>
              <p className="text-gray-600">Status: {inspection.status} with {inspection.events} events recorded.</p>
            </div>
            {inspection.explanation ? (
              <div className="p-4 bg-blue-50 text-blue-900 rounded border border-blue-200 text-sm">
                <p className="font-bold mb-2 flex items-center gap-2"><Activity className="w-4 h-4" /> Model-Attributed Contributor</p>
                <div className="space-y-2">
                  {inspection.explanation.contributors.map((c, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <span className="font-semibold text-blue-800">Probable Contributor for Human Review: {c.factor}</span>
                      <span className="text-blue-700 italic">{c.display_text}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs font-bold text-red-600 bg-red-50 p-2 rounded inline-block">
                  <AlertTriangle className="w-3 h-3 inline mr-1" /> Model focus area — not proof of physical defect cause.
                </div>
              </div>
            ) : (
              <div className="p-4 bg-orange-50 text-orange-800 rounded border border-orange-200 text-sm flex gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold mb-1">Model-Attributed Quality Contributor</p>
                  <p>No precomputed contributor data is available for this inspection event.</p>
                  <p className="mt-2 font-medium">Requires physical verification</p>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Human Cause Review</label>
                <textarea 
                  value={reviewState.humanCause}
                  onChange={(e) => handleReviewChange('humanCause', e.target.value)}
                  placeholder="Enter physically verified cause..."
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
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t flex flex-wrap gap-3">
            {matchedAlert && matchedAlert.status === 'OPEN' && (
              <button onClick={handleAcknowledge} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50">
                <CheckCircle className="w-4 h-4 text-green-600" /> Acknowledge Finding
              </button>
            )}
            <button onClick={handleCreateReviewAction} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
              Create Review Action
            </button>
            {matchedAlert && (
              <button onClick={() => navigate('/alerts')} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-sm font-medium hover:bg-indigo-100">
                <Bell className="w-4 h-4" /> Open Alerts
              </button>
            )}
          </div>
        </div>

      </div>

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
