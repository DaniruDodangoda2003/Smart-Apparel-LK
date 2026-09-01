import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../shared/context/AppContext';
import { getAlertRoute } from '../shared/alerts/alertService';
import PageHeader from '../shared/components/PageHeader';
import AlertRow from '../shared/components/AlertRow';
import ActionRow from '../shared/components/ActionRow';

export default function AlertsActions() {
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions } = useAppContext();
  
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showOpenOnly, setShowOpenOnly] = useState(false); // Default false for the dedicated page

  const filteredAlerts = globalAlerts.filter(alert => {
    if (alertFilter !== 'ALL' && alert.component_id !== alertFilter) return false;
    if (severityFilter !== 'ALL' && alert.severity !== severityFilter) return false;
    if (showOpenOnly && alert.status !== 'OPEN') return false;
    return true;
  });

  const handleAlertAction = (e, alert, newStatus) => {
    e.stopPropagation();
    updateAlert(alert.alert_id, newStatus);
  };

  const handleAlertClick = (alert) => {
    navigate(getAlertRoute(alert));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Alerts & Actions" 
        description="Manage system-wide alerts and pending actions."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Alerts List */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[700px]">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">All Alerts</h3>
            <div className="flex flex-wrap gap-2 text-sm">
              <select className="border border-gray-200 rounded-md px-2 py-1" value={alertFilter} onChange={e => setAlertFilter(e.target.value)}>
                <option value="ALL">All Components</option>
                <option value="C1">C1 Quality</option>
                <option value="C2">C2 Waste</option>
                <option value="C3">C3 Maintenance</option>
                <option value="C4">C4 Workforce</option>
              </select>
              <select className="border border-gray-200 rounded-md px-2 py-1" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
              <label className="flex items-center gap-1.5 cursor-pointer bg-gray-50 px-2 rounded-md border border-gray-200">
                <input type="checkbox" checked={showOpenOnly} onChange={e => setShowOpenOnly(e.target.checked)} className="rounded border-gray-300" />
                Open Only
              </label>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {filteredAlerts.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No alerts match the current filters.</div>
            ) : (
              <div className="space-y-2">
                {filteredAlerts.map(alert => (
                  <div key={alert.alert_id} className="relative group border border-gray-100 rounded-lg bg-white shadow-sm hover:border-blue-300 overflow-hidden">
                    <AlertRow 
                      alert={alert} 
                      onClick={() => handleAlertClick(alert)}
                    />
                    {alert.status === 'OPEN' && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-2 bg-white pl-2">
                        <button onClick={(e) => handleAlertAction(e, alert, 'ACKNOWLEDGED')} className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50">
                          Acknowledge
                        </button>
                        <button onClick={(e) => handleAlertAction(e, alert, 'RESOLVED')} className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs font-medium hover:bg-green-100">
                          Resolve
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Queue Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[700px]">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-slate-900">Action Queue</h3>
            <p className="text-sm text-gray-500 mt-1">Pending manual actions</p>
          </div>
          <div className="p-5 overflow-y-auto flex-1">
            {savedActions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-sm text-gray-500 space-y-2">
                <span className="bg-gray-50 p-4 rounded-full text-gray-300">
                   {/* Optional Icon placeholder */}
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </span>
                <span>No saved actions yet</span>
              </div>
            ) : (
              savedActions.map(action => (
                <ActionRow key={action.id} action={action} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
