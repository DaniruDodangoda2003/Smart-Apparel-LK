import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../shared/components/PageHeader';
import { useAppContext } from '../../shared/context/AppContext';
import { ArrowLeft, CheckCircle, Clock, PlayCircle, Calendar, XCircle } from 'lucide-react';

export default function C3MaintenanceActions() {
  const navigate = useNavigate();
  const { savedActions, setSavedActions } = useAppContext();
  
  // Filter only C3 actions
  const c3Actions = savedActions.filter(a => a.component_id === 'C3');

  const updateActionStatus = (actionId, newStatus) => {
    const now = new Date().toISOString();
    
    setSavedActions(prev => prev.map(a => {
      if (a.id === actionId) {
        const updated = { ...a, status: newStatus, status_updated_at: now };
        if (newStatus === 'ACKNOWLEDGED' && !a.acknowledged_at) updated.acknowledged_at = now;
        if (newStatus === 'IN_REVIEW' && !a.review_started_at) updated.review_started_at = now;
        if (newStatus === 'COMPLETED' && !a.completed_at) updated.completed_at = now;
        return updated;
      }
      return a;
    }));
  };

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
      <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status] || styles['OPEN']}`}>
        {status}
      </span>
    );
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/c3')} className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
        <PageHeader title="Local Maintenance Actions" description="Manage locally created maintenance-review actions." />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b">
                <th className="p-4 font-medium">Action ID / Source</th>
                <th className="p-4 font-medium">Machine ID</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Timestamps</th>
                <th className="p-4 font-medium text-right">Transitions</th>
              </tr>
            </thead>
            <tbody>
              {c3Actions.map(action => (
                <tr key={action.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{action.id}</div>
                    <div className="text-xs text-blue-500 mt-1 cursor-pointer hover:underline" onClick={() => navigate(action.action_route)}>
                      View Source
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-gray-700">{action.entity_id}</td>
                  <td className="p-4">{action.action_type}</td>
                  <td className="p-4">{getStatusBadge(action.status)}</td>
                  <td className="p-4 text-xs text-gray-500 space-y-1">
                    <div>Created: {formatDate(action.created_at)}</div>
                    {action.status_updated_at && <div>Updated: {formatDate(action.status_updated_at)}</div>}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {action.status === 'OPEN' && (
                        <button onClick={() => updateActionStatus(action.id, 'ACKNOWLEDGED')} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded text-xs font-medium">
                          <CheckCircle className="w-3 h-3" /> Acknowledge
                        </button>
                      )}
                      {(action.status === 'OPEN' || action.status === 'ACKNOWLEDGED') && (
                        <button onClick={() => updateActionStatus(action.id, 'IN_REVIEW')} className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 rounded text-xs font-medium">
                          <PlayCircle className="w-3 h-3" /> Mark In Review
                        </button>
                      )}
                      {action.status === 'IN_REVIEW' && (
                        <button onClick={() => updateActionStatus(action.id, 'SCHEDULED')} className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded text-xs font-medium">
                          <Calendar className="w-3 h-3" /> Mark Scheduled
                        </button>
                      )}
                      {action.status === 'SCHEDULED' && (
                        <button onClick={() => updateActionStatus(action.id, 'COMPLETED')} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded text-xs font-medium">
                          <CheckCircle className="w-3 h-3" /> Mark Completed
                        </button>
                      )}
                      {['OPEN', 'ACKNOWLEDGED', 'IN_REVIEW', 'SCHEDULED'].includes(action.status) && (
                        <button onClick={() => updateActionStatus(action.id, 'CANCELLED')} className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 rounded text-xs font-medium">
                          <XCircle className="w-3 h-3" /> Cancel
                        </button>
                      )}
                      {['COMPLETED', 'CANCELLED'].includes(action.status) && (
                        <span className="text-gray-400 text-xs italic">Terminal state</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {c3Actions.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">No C3 maintenance actions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
