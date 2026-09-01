import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { ArrowLeft, AlertTriangle, CheckCircle, Activity, Eye, Users, Bell } from 'lucide-react';

export default function C4LineDiagnostics() {
  const { lineId } = useParams();
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions, setSavedActions } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lineRecord, setLineRecord] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c4Lines, sharedLines, diags] = await loadMultipleDemoJson([
          'c4/lines.json',
          'shared/lines.json',
          'c4/diagnostics.json'
        ]);
        
        const c4 = c4Lines.find(l => l.line_id === lineId);
        if (!c4) throw new Error('Line record not found in current demo fixture.');
        
        const shared = sharedLines.find(s => s.line_id === lineId);
        const lineDiag = (diags || []).find(d => d.line_id === lineId);
        
        setLineRecord({
          ...c4,
          factory_id: shared ? shared.factory_id : 'Not available',
          name: shared ? shared.name : 'Unknown',
          status: shared ? shared.status : 'Unknown'
        });
        setDiagnostics(lineDiag);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [lineId]);

  if (loading) return <LoadingState message="Loading Line Diagnostics..." />;
  if (error) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <ErrorState title="Failed to load line diagnostics data" message={error} />
      <button onClick={() => navigate('/c4')} className="text-blue-600 hover:underline flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to Workforce Overview</button>
    </div>
  );

  const matchedAlert = globalAlerts.find(a => a.component_id === 'C4' && a.entity_id === lineRecord.line_id);

  const handleAcknowledge = () => {
    if (matchedAlert) {
      updateAlert(matchedAlert.alert_id, 'ACKNOWLEDGED');
    }
  };

  const handleCreateReviewAction = () => {
    const actionType = 'WORKFORCE_REVIEW';
    const exists = savedActions.some(a => 
      a.component_id === 'C4' && 
      a.entity_id === lineRecord.line_id && 
      a.action_type === actionType &&
      (a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
    );

    if (!exists) {
      const newAction = {
        id: `ACT-${Date.now()}`,
        component_id: 'C4',
        run_id: null,
        entity_type: 'line',
        entity_id: lineRecord.line_id,
        action_type: actionType,
        status: 'OPEN',
        created_at: new Date().toISOString(),
        action_route: `/c4/allocation/${lineRecord.line_id}`
      };
      setSavedActions([newAction, ...savedActions]);
      alert('Workforce review action created successfully. View it in the Alerts & Actions page.');
    } else {
      alert('An active workforce review action already exists for this line.');
    }
  };

  const formatEfficiency = (val) => {
    if (typeof val === 'number') return `${(val * 100).toFixed(0)}%`;
    return val;
  };

  const ProvenanceBadge = () => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> {diagnostics ? diagnostics.output_mode : (lineRecord.output_mode || 'DEMO_PRECOMPUTED')} | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      {diagnostics && diagnostics.data_classification && (
        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold">
          Data Classification: {diagnostics.data_classification}
        </span>
      )}
      <p className="italic">Not a live production recommendation</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c4')} className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <PageHeader title={`Line Diagnostics: ${lineRecord.line_id}`} description={`Factory: ${lineRecord.factory_id} | Name: ${lineRecord.name}`} />
        </div>
        <ProvenanceBadge />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Status */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-500" /> Line Details
          </h3>
          <div className="space-y-3 text-sm flex-1">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Line ID</span>
              <span className="font-bold text-gray-900">{lineRecord.line_id}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Factory ID</span>
              <span className="font-medium text-gray-700">{lineRecord.factory_id}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Line Status</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded font-medium border border-gray-200">{lineRecord.status}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Staffing Level</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold border border-blue-200">{lineRecord.staffing_level}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Workforce Alert Status</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-medium border border-gray-200">{lineRecord.workforce_alert_status}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Precomputed Predicted Efficiency</span>
              <span className="font-bold text-gray-900">{formatEfficiency(lineRecord.predicted_efficiency)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Target Efficiency</span>
              <span className="font-bold text-gray-900">{formatEfficiency(lineRecord.target_efficiency)}</span>
            </div>
          </div>
          
          <div className="mt-6 flex flex-col gap-2">
            {matchedAlert && matchedAlert.status === 'OPEN' && (
              <button onClick={handleAcknowledge} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50">
                <CheckCircle className="w-4 h-4 text-green-600" /> Acknowledge Finding
              </button>
            )}
            <button onClick={handleCreateReviewAction} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
              <Users className="w-4 h-4" /> Create Workforce Review Action
            </button>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/c4/allocation/${lineRecord.line_id}`)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-sm font-medium hover:bg-indigo-100">
                <Eye className="w-4 h-4" /> Open Allocation Review
              </button>
              <button onClick={() => navigate('/alerts')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50">
                <Bell className="w-4 h-4" /> Open Alerts
              </button>
            </div>
          </div>
        </div>

        {/* Model-Attributed Contributors */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg border-b pb-2 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" /> Precomputed Workforce Contributors
            </div>
          </h3>
          
          {diagnostics ? (
            <div className="flex-1">
              <div className="mb-4 text-sm text-gray-600">
                <span className="font-semibold text-gray-800">Model-Attributed Workforce Contributors — Synthetic Demonstration</span>
              </div>
              <div className="space-y-4">
                {diagnostics.contributors.map((contrib, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-800">{contrib.display_label}</span>
                      <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded text-gray-700">{contrib.feature_key}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${contrib.direction === 'DECREASES_MODEL_OUTPUT' ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(contrib.contribution_score * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-semibold text-gray-600 w-16 text-right">
                        Score: {contrib.contribution_score.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Direction: {contrib.direction}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200 text-sm text-orange-800 flex gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold mb-1">Requires Production-Team Review</p>
                  <p>{diagnostics.limitation}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 rounded border border-gray-100 text-gray-500 text-center">
              No precomputed workforce-contributor data is available for this line.
            </div>
          )}
        </div>

      </div>

      {/* Prototype Limitations Notice */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300 space-y-3">
        <h4 className="font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" /> Prototype Limitations</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Workforce forecasts are fixed precomputed demonstration outputs.</li>
          <li>Model attributions do not prove operational or employee-level causation.</li>
          <li>Extended operator skill profiles are synthetic demonstration data.</li>
          <li>Allocation candidates are precomputed demonstration candidates.</li>
          <li>Simulated gains are not guaranteed productivity results.</li>
          <li>No live HR, attendance, production or skill-matrix system is connected.</li>
          <li>Human approval and factory validation are required.</li>
        </ul>
      </div>
    </div>
  );
}
