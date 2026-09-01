import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { CheckCircle2, ChevronRight, PlayCircle, Calendar, XCircle, Clock } from 'lucide-react';

export default function ActionRow({ action, onExecute }) {
  const navigate = useNavigate();
  const { setSavedActions } = useAppContext();

  // A generic status transition helper for components that opt into this lifecycle (e.g. C4)
  const handleTransition = (newStatus) => {
    const now = new Date().toISOString();
    setSavedActions(prev => prev.map(a => {
      if (a.id === action.id) {
        const updated = { ...a, status: newStatus, status_updated_at: now };
        if (newStatus === 'ACKNOWLEDGED' && !a.acknowledged_at) updated.acknowledged_at = now;
        if (newStatus === 'IN_REVIEW' && !a.review_started_at) updated.review_started_at = now;
        if (newStatus === 'COMPLETED' && !a.completed_at) updated.completed_at = now;
        return updated;
      }
      return a;
    }));
  };

  const isTransitionable = true; // Enabled for all components (C1, C2, C3, C4)

  const getStatusBadge = (status) => {
    const styles = {
      'OPEN': 'bg-blue-100 text-blue-700',
      'ACKNOWLEDGED': 'bg-indigo-100 text-indigo-700',
      'IN_REVIEW': 'bg-yellow-100 text-yellow-700',
      'SCHEDULED': 'bg-purple-100 text-purple-700',
      'COMPLETED': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-gray-200 text-gray-700'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${styles[status] || styles['OPEN']}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex flex-col p-4 border rounded-lg mb-3 bg-white hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">{action.title || `${action.component_id} Action: ${action.action_type}`}</p>
            <p className="text-xs text-gray-500 mt-0.5">ID: {action.id} {action.entity_id ? `| Entity: ${action.entity_id}` : ''}</p>
            {action.impact && <p className="text-sm text-gray-500 mt-1">{action.impact}</p>}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {action.status && getStatusBadge(action.status)}
          
          {/* Legacy onExecute (C1, C2) */}
          {onExecute && !isTransitionable && (
            <button
              onClick={() => onExecute(action)}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
            >
              Execute
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}

          {/* View Source Route */}
          {!onExecute && action.action_route && (
            <button
              onClick={() => navigate(action.action_route)}
              className="text-xs text-blue-500 hover:underline"
            >
              View Details
            </button>
          )}
        </div>
      </div>

      {/* Modern Transition Workflow */}
      {isTransitionable && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
          {action.status === 'OPEN' && (
            <button onClick={() => handleTransition('ACKNOWLEDGED')} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded text-xs font-medium">
              <CheckCircle2 className="w-3 h-3" /> Acknowledge
            </button>
          )}
          {(action.status === 'OPEN' || action.status === 'ACKNOWLEDGED') && (
            <button onClick={() => handleTransition('IN_REVIEW')} className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 rounded text-xs font-medium">
              <PlayCircle className="w-3 h-3" /> Mark In Review
            </button>
          )}
          {action.status === 'IN_REVIEW' && (
            <button onClick={() => handleTransition('SCHEDULED')} className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded text-xs font-medium">
              <Calendar className="w-3 h-3" /> Mark Scheduled
            </button>
          )}
          {action.status === 'SCHEDULED' && (
            <button onClick={() => handleTransition('COMPLETED')} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded text-xs font-medium">
              <CheckCircle2 className="w-3 h-3" /> Mark Completed
            </button>
          )}
          {['OPEN', 'ACKNOWLEDGED', 'IN_REVIEW', 'SCHEDULED'].includes(action.status) && (
            <button onClick={() => handleTransition('CANCELLED')} className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 rounded text-xs font-medium">
              <XCircle className="w-3 h-3" /> Cancel
            </button>
          )}
          {['COMPLETED', 'CANCELLED'].includes(action.status) && (
            <span className="text-gray-400 text-xs italic">Terminal state</span>
          )}
        </div>
      )}
    </div>
  );
}
