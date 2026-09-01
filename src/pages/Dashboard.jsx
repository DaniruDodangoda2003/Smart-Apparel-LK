import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../shared/context/AppContext';
import { loadMultipleDemoJson } from '../shared/data/loaders';
import { getAlertRoute } from '../shared/alerts/alertService';
import { getMergedC1Summary } from '../shared/adapters/c1DashboardAdapter';
import { getMergedC2Summary } from '../shared/adapters/c2DashboardAdapter';
import { getMergedC3Summary } from '../shared/adapters/c3DashboardAdapter';
import { getMergedC4Summary } from '../shared/adapters/c4DashboardAdapter';
import PageHeader from '../shared/components/PageHeader';
import LoadingState from '../shared/components/LoadingState';
import ErrorState from '../shared/components/ErrorState';
import AlertRow from '../shared/components/AlertRow';
import ActionRow from '../shared/components/ActionRow';
import { Scissors, Recycle, Wrench, Users, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions } = useAppContext();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Alert Filters
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showOpenOnly, setShowOpenOnly] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c1, c2, c3, c4] = await loadMultipleDemoJson([
          'c1/summary.json',
          'c2/summary.json',
          'c3/summary.json',
          'c4/summary.json'
        ]);
        setData({ 
          c1: getMergedC1Summary(c1), 
          c2: getMergedC2Summary(c2), 
          c3: getMergedC3Summary(c3, savedActions), 
          c4: getMergedC4Summary(c4, savedActions) 
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading dashboard data..." />;
  if (error) return <ErrorState title="Failed to load dashboard data" message={error} />;

  // Filter alerts
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
    <div className="space-y-6">
      <PageHeader title="Executive Dashboard" />

      {/* 4 Component Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* C1 Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Scissors className="w-5 h-5" /></div>
            <h3 className="font-semibold text-slate-900">Fabric Quality</h3>
          </div>
          <div className="p-5 flex-1 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div><p className="text-gray-500">Inspections</p><p className="font-semibold text-gray-900">{data.c1?.inspection_count ?? 'N/A'}</p></div>
            <div><p className="text-gray-500">Pending Reviews</p><p className="font-semibold text-gray-900">{data.c1?.pending_review_count ?? 'N/A'}</p></div>
            <div><p className="text-gray-500">Defect Events</p><p className="font-semibold text-orange-600">{data.c1?.defect_event_count ?? 'N/A'}</p></div>
            <div><p className="text-gray-500">Critical Events</p><p className="font-semibold text-red-600">{data.c1?.critical_event_count ?? 'N/A'}</p></div>
            <div className="col-span-2"><p className="text-gray-500">Most Affected Line: <span className="font-semibold text-gray-900">{data.c1?.most_affected_line ?? 'N/A'}</span></p></div>
          </div>
          <button onClick={() => navigate('/c1')} className="mt-auto w-full py-3 bg-gray-50 hover:bg-blue-50 text-blue-600 text-sm font-medium transition-colors flex items-center justify-center border-t border-gray-100">
            Open C1 <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* C2 Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Recycle className="w-5 h-5" /></div>
            <h3 className="font-semibold text-slate-900">Fabric Waste</h3>
          </div>
          <div className="p-5 flex-1 space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Predicted Waste</span>
              <span className="font-semibold text-orange-600 text-lg">{data.c2?.latest_predicted_waste ?? 'N/A'}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">High-Waste Batches</span>
              <span className="font-semibold text-gray-900">{data.c2?.high_waste_batch_count ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Strategy</span>
              <span className="font-medium px-2 py-0.5 bg-gray-50 rounded-md border border-gray-200">{data.c2?.selection_status ?? 'NOT SELECTED'}</span>
            </div>
            {data.c2?.selection_status === 'SELECTED' && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Approval</span>
                <span className={`font-medium px-2 py-0.5 rounded-md border ${data.c2?.approval_status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                  {data.c2?.approval_status ?? 'PENDING'}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Post-Cut Validation</span>
              <span className="text-gray-600 font-medium px-2 py-0.5 bg-gray-100 rounded-md border border-gray-200">{data.c2?.validation_status ?? 'N/A'}</span>
            </div>
          </div>
          <button onClick={() => navigate('/c2')} className="mt-auto w-full py-3 bg-gray-50 hover:bg-blue-50 text-blue-600 text-sm font-medium transition-colors flex items-center justify-center border-t border-gray-100">
            Open C2 <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* C3 Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Wrench className="w-5 h-5" /></div>
            <h3 className="font-semibold text-slate-900">Pred. Maintenance</h3>
          </div>
          <div className="p-5 flex-1 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div><p className="text-gray-500">Machines</p><p className="font-semibold text-gray-900">{data.c3?.active_machines ?? 'N/A'}</p></div>
            <div><p className="text-gray-500">Fixture Pending Actions</p><p className="font-semibold text-gray-900">{data.c3?.maintenance_actions_pending ?? 'N/A'}</p></div>
            <div><p className="text-gray-500">High-Risk</p><p className="font-semibold text-red-600">{data.c3?.critical_risk_machines ?? 'N/A'}</p></div>
            <div><p className="text-gray-500">Warning</p><p className="font-semibold text-orange-600">{data.c3?.warning_risk_machines ?? 'N/A'}</p></div>
            <div className="col-span-2 border-t pt-3 mt-1"><p className="text-gray-500">Local Open Maintenance Actions: <span className="font-semibold text-indigo-600">{data.c3?.local_open_maintenance_actions ?? 0}</span></p></div>
          </div>
          <button onClick={() => navigate('/c3')} className="mt-auto w-full py-3 bg-gray-50 hover:bg-blue-50 text-blue-600 text-sm font-medium transition-colors flex items-center justify-center border-t border-gray-100">
            Open C3 <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* C4 Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-5 h-5" /></div>
            <h3 className="font-semibold text-slate-900">Workforce</h3>
          </div>
          <div className="p-5 flex-1 space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Pred. Efficiency</span>
              <span className="font-semibold text-gray-900 text-lg">
                {typeof data.c4?.overall_efficiency === 'number' ? `${(data.c4.overall_efficiency * 100).toFixed(0)}%` : (data.c4?.overall_efficiency ?? 'N/A')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Bottlenecks</span>
              <span className="font-semibold text-orange-600">{data.c4?.bottleneck_lines ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Absent Staff</span>
              <span className="font-semibold text-red-600">{data.c4?.absent_operators ?? 'N/A'}</span>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs">Local Open Workforce Review Actions</span>
                <span className="font-semibold text-indigo-600">{data.c4?.local_open_workforce_actions ?? 0}</span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/c4')} className="mt-auto w-full py-3 bg-gray-50 hover:bg-blue-50 text-blue-600 text-sm font-medium transition-colors flex items-center justify-center border-t border-gray-100">
            Open C4 <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts Section */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Recent Alerts</h3>
            <div className="flex gap-2 text-sm">
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
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showOpenOnly} onChange={e => setShowOpenOnly(e.target.checked)} className="rounded border-gray-300" />
                Open Only
              </label>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No alerts match the current filters.</div>
            ) : (
              filteredAlerts.map(alert => (
                <div key={alert.alert_id} className="relative group">
                  <AlertRow 
                    alert={alert} 
                    onClick={() => handleAlertClick(alert)}
                  />
                  {alert.status === 'OPEN' && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-2">
                      <button onClick={(e) => handleAlertAction(e, alert, 'ACKNOWLEDGED')} className="px-3 py-1 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50">
                        Acknowledge
                      </button>
                      <button onClick={(e) => handleAlertAction(e, alert, 'RESOLVED')} className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs font-medium hover:bg-green-100">
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Queue Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-slate-900">Action Queue</h3>
          </div>
          <div className="p-5 overflow-y-auto flex-1">
            {savedActions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                No saved actions yet
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
