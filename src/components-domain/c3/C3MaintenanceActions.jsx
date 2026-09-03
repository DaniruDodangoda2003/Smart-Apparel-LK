import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../shared/components/PageHeader';
import { useAppContext } from '../../shared/context/AppContext';
import {
  ArrowLeft, CheckCircle, Clock, PlayCircle, Calendar,
  XCircle, Plus, Info, AlertCircle
} from 'lucide-react';

// C3 internal status flow:
// OPEN → SCHEDULED → IN_PROGRESS → COMPLETED
// Cancel available for: OPEN, SCHEDULED, IN_PROGRESS

function getStatusBadge(status) {
  const styles = {
    OPEN:        'bg-blue-100 text-blue-700',
    SCHEDULED:   'bg-purple-100 text-purple-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED:   'bg-green-100 text-green-700',
    CANCELLED:   'bg-gray-100 text-gray-500 line-through'
  };
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-bold ${styles[status] || styles['OPEN']}`}>
      {status}
    </span>
  );
}

function getPriorityBadge(priority) {
  const styles = {
    CRITICAL:      'bg-red-100 text-red-700',
    MANUAL_REVIEW: 'bg-amber-100 text-amber-800',
    HIGH:          'bg-orange-100 text-orange-700',
    WARNING:       'bg-yellow-100 text-yellow-700',
    MEDIUM:        'bg-blue-50 text-blue-700',
    MONITOR:       'bg-sky-50 text-sky-700',
    LOW:           'bg-gray-100 text-gray-600'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${styles[priority] || styles['MEDIUM']}`}>
      {priority || '—'}
    </span>
  );
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

export default function C3MaintenanceActions() {
  const navigate = useNavigate();
  const { savedActions, setSavedActions } = useAppContext();
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Filter only C3 actions
  const allC3Actions = savedActions
    .filter(a => a.component_id === 'C3')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const c3Actions = filterStatus === 'ALL'
    ? allC3Actions
    : allC3Actions.filter(a => a.status === filterStatus);

  const updateActionStatus = (actionId, newStatus) => {
    const now = new Date().toISOString();
    const updated = savedActions.map(a => {
      if (a.id === actionId) {
        const u = { ...a, status: newStatus, status_updated_at: now };
        if (newStatus === 'COMPLETED' && !a.completed_at) u.completed_at = now;
        return u;
      }
      return a;
    });
    setSavedActions(updated);
  };

  // Status flow transitions for C3
  const getTransitions = (action) => {
    const transitions = [];
    if (action.status === 'OPEN') {
      transitions.push({
        label: 'Mark Scheduled',
        newStatus: 'SCHEDULED',
        icon: <Calendar className="w-3 h-3" />,
        style: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
      });
    }
    if (action.status === 'SCHEDULED') {
      transitions.push({
        label: 'Mark In Progress',
        newStatus: 'IN_PROGRESS',
        icon: <PlayCircle className="w-3 h-3" />,
        style: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
      });
    }
    if (action.status === 'IN_PROGRESS') {
      transitions.push({
        label: 'Mark Completed',
        newStatus: 'COMPLETED',
        icon: <CheckCircle className="w-3 h-3" />,
        style: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
      });
    }
    if (['OPEN', 'SCHEDULED', 'IN_PROGRESS'].includes(action.status)) {
      transitions.push({
        label: 'Cancel',
        newStatus: 'CANCELLED',
        icon: <XCircle className="w-3 h-3" />,
        style: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
      });
    }
    return transitions;
  };

  const openCount      = allC3Actions.filter(a => a.status === 'OPEN').length;
  const scheduledCount = allC3Actions.filter(a => a.status === 'SCHEDULED').length;
  const inProgressCount = allC3Actions.filter(a => a.status === 'IN_PROGRESS').length;
  const completedCount = allC3Actions.filter(a => a.status === 'COMPLETED').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/c3')} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title="Maintenance Actions"
          description="Manage C3 predictive maintenance actions. Status: OPEN → SCHEDULED → IN_PROGRESS → COMPLETED."
        />
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-200 font-medium shrink-0">
          <Info className="w-3.5 h-3.5" />
          DEMO_PRECOMPUTED
        </span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Open',        value: openCount,       color: 'text-blue-600'   },
          { label: 'Scheduled',   value: scheduledCount,  color: 'text-purple-600' },
          { label: 'In Progress', value: inProgressCount, color: 'text-yellow-600' },
          { label: 'Completed',   value: completedCount,  color: 'text-green-600'  }
        ].map(k => (
          <div key={k.label} className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 text-center">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter + Create */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600">Filter:</span>
          {['ALL', 'OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                filterStatus === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Actions table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b text-xs">
                <th className="p-3.5 font-semibold">Action ID</th>
                <th className="p-3.5 font-semibold">Machine</th>
                <th className="p-3.5 font-semibold">Action Type</th>
                <th className="p-3.5 font-semibold">Priority</th>
                <th className="p-3.5 font-semibold">Assigned Team</th>
                <th className="p-3.5 font-semibold">Scheduled</th>
                <th className="p-3.5 font-semibold">Notes</th>
                <th className="p-3.5 font-semibold text-center">Status</th>
                <th className="p-3.5 font-semibold">Timestamps</th>
                <th className="p-3.5 font-semibold text-right">Transitions</th>
              </tr>
            </thead>
            <tbody>
              {c3Actions.map(action => (
                <tr key={action.id} className="border-b hover:bg-gray-50/60 transition-colors">
                  <td className="p-3.5">
                    <div className="font-mono text-xs text-gray-700">{action.action_id || action.id}</div>
                    <button
                      onClick={() => navigate(action.action_route || `/c3/machine/${action.machine_id || action.entity_id}`)}
                      className="text-[11px] text-blue-500 hover:underline mt-0.5"
                    >
                      View Source ↗
                    </button>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-gray-900 text-sm">
                      {action.display_code || action.entity_id}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {action.machine_id || action.entity_id}
                    </div>
                  </td>
                  <td className="p-3.5 text-sm text-gray-700">
                    {action.action_type === 'MAINTENANCE_REVIEW' ? 'Maintenance Review' : (action.action_type || '—')}
                  </td>
                  <td className="p-3.5">{getPriorityBadge(action.priority)}</td>
                  <td className="p-3.5 text-xs text-gray-600">{action.assigned_team || '—'}</td>
                  <td className="p-3.5 text-xs text-gray-600 whitespace-nowrap">
                    {action.scheduled_at ? formatDate(action.scheduled_at) : '—'}
                  </td>
                  <td className="p-3.5 text-xs text-gray-500 max-w-[160px]">
                    <span className="line-clamp-2">{action.notes || '—'}</span>
                  </td>
                  <td className="p-3.5 text-center">{getStatusBadge(action.status)}</td>
                  <td className="p-3.5 text-xs text-gray-400 space-y-0.5 whitespace-nowrap">
                    <div>Created: {formatDate(action.created_at)}</div>
                    {action.status_updated_at && <div>Updated: {formatDate(action.status_updated_at)}</div>}
                    {action.completed_at && <div>Completed: {formatDate(action.completed_at)}</div>}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {getTransitions(action).map(tr => (
                        <button
                          key={tr.newStatus}
                          onClick={() => updateActionStatus(action.id, tr.newStatus)}
                          className={`flex items-center gap-1 px-2 py-1 border rounded text-xs font-medium ${tr.style}`}
                        >
                          {tr.icon} {tr.label}
                        </button>
                      ))}
                      {['COMPLETED', 'CANCELLED'].includes(action.status) && (
                        <span className="text-gray-300 text-xs italic">Terminal</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {c3Actions.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-10 text-center">
                    <div className="text-gray-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No C3 maintenance actions found.</p>
                      <p className="text-xs mt-1">Actions are created from the Machine Analysis page.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status flow legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">C3 Internal Maintenance Action Status Flow</p>
        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
          {['OPEN', '→', 'SCHEDULED', '→', 'IN_PROGRESS', '→', 'COMPLETED'].map((item, i) => (
            item === '→'
              ? <span key={i} className="text-gray-400 font-bold">{item}</span>
              : <span key={i} className={`px-2 py-0.5 rounded font-semibold ${
                  item === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                  item === 'SCHEDULED' ? 'bg-purple-100 text-purple-700' :
                  item === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-700'
                }`}>{item}</span>
          ))}
          <span className="text-gray-400 ml-2">· Cancel available for OPEN / SCHEDULED / IN_PROGRESS</span>
        </div>
      </div>
    </div>
  );
}
