import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import {
  ArrowLeft, CheckCircle, Info, AlertCircle, Calendar, Clock, User, FileText
} from 'lucide-react';

const ACTION_TYPES = [
  { value: 'Inspection',            label: 'Inspection' },
  { value: 'Preventive Maintenance', label: 'Preventive Maintenance' },
  { value: 'Continue Monitoring',   label: 'Continue Monitoring' },
  { value: 'Manual Review',         label: 'Manual Review' },
  { value: 'Other',                 label: 'Other' }
];

const TEAMS = ['TEAM-A', 'TEAM-B', 'TEAM-C'];

// Actions requiring a scheduled date/time
const REQUIRES_SCHEDULE = ['Inspection', 'Preventive Maintenance'];

export default function C3MaintenanceActionForm() {
  const { machineId } = useParams();
  const navigate      = useNavigate();
  const { savedActions, setSavedActions } = useAppContext();

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [machineInfo, setMachineInfo] = useState(null);
  const [saved, setSaved]           = useState(false);

  // Form fields
  const [actionType, setActionType]     = useState('');
  const [assignedTeam, setAssignedTeam] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [notes, setNotes]               = useState('');

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [preds, limitedList, machines] = await loadMultipleDemoJson([
          'c3/predictions.json',
          'c3/limited_scenarios.json',
          'shared/machines.json'
        ]);
        const machineRecord = machines.find(m => m.machine_id === machineId);
        setMachineInfo(machineRecord || null);

        let predRecord = preds.find(p => p.machine_id === machineId)
          || limitedList.find(s => s.machine_id === machineId);

        if (!predRecord && machineRecord) {
          predRecord = {
            machine_id: machineRecord.machine_id,
            display_code: machineRecord.display_code,
            factory_id: machineRecord.factory_id,
            line_id: machineRecord.line_id,
            priority: 'MEDIUM',
            data_sufficiency: 'GOOD',
            output_mode: 'DEMO_PRECOMPUTED',
            scored_at: null
          };
        }
        if (!predRecord) throw new Error('Machine record not found.');

        // Resolve display priority
        const displayPriority = predRecord.data_sufficiency === 'LIMITED' ? 'MANUAL_REVIEW' : predRecord.priority;
        setPrediction({ ...predRecord, displayPriority });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [machineId]);

  if (loading) return <LoadingState message="Loading machine context..." />;
  if (error)   return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <ErrorState title="Failed to load machine context" message={error} />
      <button onClick={() => navigate(`/c3/machine/${machineId}`)} className="text-blue-600 hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Return to Machine Analysis
      </button>
    </div>
  );

  const validate = () => {
    const errors = {};
    if (!prediction.machine_id) errors.machine_id = 'Machine ID is required.';
    if (!actionType)             errors.actionType = 'Action type is required.';
    if (REQUIRES_SCHEDULE.includes(actionType)) {
      if (!scheduledDate) errors.scheduledDate = 'Scheduled date is required for this action type.';
      if (!scheduledTime) errors.scheduledTime = 'Scheduled time is required for this action type.';
      if (scheduledDate && scheduledTime) {
        const scheduled = new Date(`${scheduledDate}T${scheduledTime}`);
        if (scheduled <= new Date()) {
          errors.scheduledDate = 'Scheduled date/time must be in the future.';
        }
      }
    }
    return errors;
  };

  const handleSave = () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    const isScheduled = REQUIRES_SCHEDULE.includes(actionType) && scheduledDate && scheduledTime;
    const scheduledAt = isScheduled ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null;

    const newAction = {
      // C3-specific maintenance action schema
      action_id: `C3-ACT-${Date.now()}`,
      id: `C3-ACT-${Date.now()}`,          // shared key used by AppContext savedActions
      component_id: 'C3',
      machine_id: prediction.machine_id,
      display_code: prediction.display_code,
      source_prediction_id: prediction.output_mode === 'DEMO_PRECOMPUTED'
        ? `PRED-${prediction.machine_id}-2026090106`
        : null,
      action_type: actionType,
      priority: prediction.displayPriority,
      assigned_team: assignedTeam || null,
      scheduled_at: scheduledAt,
      notes: notes.trim() || null,
      status: isScheduled ? 'SCHEDULED' : 'OPEN',
      created_at: new Date().toISOString(),
      completed_at: null,
      // Fields for cross-component compatibility
      entity_type: 'machine',
      entity_id: prediction.machine_id,
      action_route: `/c3/machine/${prediction.machine_id}`
    };

    setSavedActions([newAction, ...savedActions]);
    setSaved(true);
  };

  const handleReturn = () => navigate(`/c3/machine/${machineId}`);
  const handleCancel = () => navigate(`/c3/machine/${machineId}`);

  const requiresSchedule = REQUIRES_SCHEDULE.includes(actionType);

  const priorityStyle = {
    CRITICAL:      'bg-red-100 text-red-700 border-red-200',
    MANUAL_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
    HIGH:          'bg-orange-100 text-orange-700 border-orange-200',
    WARNING:       'bg-yellow-100 text-yellow-700 border-yellow-200',
    MEDIUM:        'bg-blue-50 text-blue-700 border-blue-200',
    MONITOR:       'bg-sky-50 text-sky-700 border-sky-200'
  }[prediction.displayPriority] || 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={handleCancel} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create Maintenance Action</h1>
          <p className="text-sm text-gray-500">
            {prediction.display_code} · {machineInfo?.machine_type || '—'} · {prediction.line_id}
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-200 font-medium">
          <Info className="w-3.5 h-3.5" />
          DEMO_PRECOMPUTED
        </span>
      </div>

      {/* Success banner */}
      {saved && (
        <div className="p-4 bg-green-50 border border-green-300 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800 text-sm">Maintenance action scheduled.</p>
            <p className="text-xs text-green-700 mt-0.5">The action has been saved and will persist after refresh.</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => navigate('/c3/actions')}
              className="text-xs font-medium text-green-700 hover:underline"
            >
              View Actions
            </button>
            <button
              onClick={handleReturn}
              className="text-xs font-medium text-green-700 hover:underline"
            >
              Return to Machine
            </button>
          </div>
        </div>
      )}

      {/* Read-only machine context */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-400" /> Machine Context (read-only)
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { label: 'Machine ID',            value: prediction.machine_id   },
            { label: 'Display Code',          value: prediction.display_code },
            { label: 'Machine Type',          value: machineInfo?.machine_type || '—' },
            { label: 'Line',                  value: prediction.line_id      },
            { label: 'Source Prediction ID',  value: `PRED-${prediction.machine_id}-2026090106` },
            { label: 'Scoring Timestamp',     value: prediction.scored_at
              ? new Date(prediction.scored_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '—' }
          ].map(item => (
            <div key={item.label} className="bg-white p-2.5 rounded-lg border border-gray-100">
              <p className="text-gray-400 text-[10px] uppercase tracking-wide">{item.label}</p>
              <p className="font-semibold text-gray-800 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Current Priority</span>
          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${priorityStyle}`}>
            {prediction.displayPriority}
          </span>
        </div>
      </div>

      {/* Editable form */}
      {!saved && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Action Details</h3>

          {/* Action Type */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600" htmlFor="action-type">
              Action Type <span className="text-red-500">*</span>
            </label>
            <select
              id="action-type"
              value={actionType}
              onChange={e => { setActionType(e.target.value); setValidationErrors(v => ({ ...v, actionType: undefined })); }}
              className={`w-full border rounded-md py-2 px-3 text-sm ${validationErrors.actionType ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select action type…</option>
              {ACTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {validationErrors.actionType && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {validationErrors.actionType}
              </p>
            )}
          </div>

          {/* Assigned Team */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600" htmlFor="assigned-team">
              <User className="w-3.5 h-3.5 inline mr-1" />Assigned Team
            </label>
            <select
              id="assigned-team"
              value={assignedTeam}
              onChange={e => setAssignedTeam(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm"
            >
              <option value="">Select team (optional)…</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Scheduled Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600" htmlFor="scheduled-date">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Scheduled Date {requiresSchedule && <span className="text-red-500">*</span>}
              </label>
              <input
                id="scheduled-date"
                type="date"
                value={scheduledDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => { setScheduledDate(e.target.value); setValidationErrors(v => ({ ...v, scheduledDate: undefined })); }}
                className={`w-full border rounded-md py-2 px-3 text-sm ${validationErrors.scheduledDate ? 'border-red-400' : 'border-gray-300'}`}
              />
              {validationErrors.scheduledDate && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.scheduledDate}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600" htmlFor="scheduled-time">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                Scheduled Time {requiresSchedule && <span className="text-red-500">*</span>}
              </label>
              <input
                id="scheduled-time"
                type="time"
                value={scheduledTime}
                onChange={e => { setScheduledTime(e.target.value); setValidationErrors(v => ({ ...v, scheduledTime: undefined })); }}
                className={`w-full border rounded-md py-2 px-3 text-sm ${validationErrors.scheduledTime ? 'border-red-400' : 'border-gray-300'}`}
              />
              {validationErrors.scheduledTime && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.scheduledTime}
                </p>
              )}
            </div>
          </div>
          {requiresSchedule && (
            <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
              Scheduled date and time are required for <strong>{actionType}</strong>. Past dates are not permitted.
            </p>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600" htmlFor="action-notes">
              <FileText className="w-3.5 h-3.5 inline mr-1" />Notes
            </label>
            <textarea
              id="action-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add maintenance notes, observations, or instructions…"
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              {requiresSchedule ? 'Schedule Action' : 'Save Action'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReturn}
              className="px-4 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors ml-auto"
            >
              Return to Machine
            </button>
          </div>
        </div>
      )}

      {/* Post-save action panel */}
      {saved && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Next Steps</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/c3/actions')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              View All Maintenance Actions
            </button>
            <button
              onClick={handleReturn}
              className="px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100"
            >
              Return to Machine Analysis
            </button>
            <button
              onClick={() => navigate('/c3')}
              className="px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100"
            >
              Back to Fleet Overview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
