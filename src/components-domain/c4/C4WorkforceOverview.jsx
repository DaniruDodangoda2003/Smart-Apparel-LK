import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { Search, AlertTriangle, Eye, Users, CheckCircle, Activity, UserCheck, ActivitySquare } from 'lucide-react';

export default function C4WorkforceOverview() {
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions, setSavedActions } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [summary, setSummary] = useState(null);
  const [c4Lines, setC4Lines] = useState([]);
  const [sharedLines, setSharedLines] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, c4lns, sharedLns] = await loadMultipleDemoJson([
          'c4/summary.json',
          'c4/lines.json',
          'shared/lines.json'
        ]);
        setSummary(sum);
        setC4Lines(c4lns);
        setSharedLines(sharedLns);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading C4 Workforce data..." />;
  if (error) return <ErrorState title="Failed to load C4 data" message={error} />;

  // Merge c4 lines with shared lines
  const mergedLines = c4Lines.map(c4line => {
    const shared = sharedLines.find(s => s.line_id === c4line.line_id);
    return {
      ...c4line,
      factory_id: shared ? shared.factory_id : 'Not available',
      name: shared ? shared.name : 'Unknown',
      status: shared ? shared.status : 'Unknown'
    };
  });

  const filteredLines = mergedLines.filter(line => 
    line.line_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    line.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAcknowledge = (alertId) => {
    updateAlert(alertId, 'ACKNOWLEDGED');
  };

  const handleCreateReviewAction = (lineId) => {
    const actionType = 'WORKFORCE_REVIEW';
    const exists = savedActions.some(a => 
      a.component_id === 'C4' && 
      a.entity_id === lineId && 
      a.action_type === actionType &&
      (a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
    );

    if (!exists) {
      const newAction = {
        id: `ACT-${Date.now()}`,
        component_id: 'C4',
        run_id: null,
        entity_type: 'line',
        entity_id: lineId,
        action_type: actionType,
        status: 'OPEN',
        created_at: new Date().toISOString(),
        action_route: `/c4/allocation/${lineId}`
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
        <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      <p className="italic">Not a live production recommendation</p>
    </div>
  );

  const localOpenActions = savedActions.filter(
    a => a.component_id === 'C4' && (a.status === 'OPEN' || a.status === 'ACKNOWLEDGED' || a.status === 'IN_REVIEW' || a.status === 'SCHEDULED')
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageHeader title="Workforce Intelligence (C4)" description="Review production-line workforce information and line-allocation status." />
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 w-fit">
            <UserCheck className="w-3.5 h-3.5" /> Primary Users: Production Manager / Workforce Planner / Industrial Engineer
          </div>
        </div>
        <ProvenanceBadge />
      </div>

      {/* KPIs directly from summary.json */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Total Lines</p>
          <p className="text-2xl font-bold mt-1">{summary.total_lines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Bottleneck Lines</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{summary.bottleneck_lines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Overall Efficiency</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatEfficiency(summary.overall_efficiency)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Absent Operators</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary.absent_operators}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-700 font-medium">Local Open Workforce Actions</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{localOpenActions}</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search by Line ID or Name..."
            className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => navigate('/alerts')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          <Activity className="w-4 h-4" /> Open Alerts & Actions
        </button>
      </div>

      {/* Lines Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b">
                <th className="p-4 font-medium">Line ID</th>
                <th className="p-4 font-medium">Line Name</th>
                <th className="p-4 font-medium">Factory ID</th>
                <th className="p-4 font-medium">Line Status</th>
                <th className="p-4 font-medium">Staffing Level</th>
                <th className="p-4 font-medium">Workforce Alert Status</th>
                <th className="p-4 font-medium">Precomputed Predicted Efficiency</th>
                <th className="p-4 font-medium">Target Efficiency</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLines.map(line => {
                const alert = globalAlerts.find(a => a.component_id === 'C4' && a.entity_id === line.line_id && a.status === 'OPEN');
                
                return (
                  <tr key={line.line_id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium text-blue-600">{line.line_id}</td>
                    <td className="p-4">{line.name}</td>
                    <td className="p-4">{line.factory_id}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {line.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        line.staffing_level === 'UNDERSTAFFED' ? 'bg-orange-100 text-orange-700' :
                        line.staffing_level === 'OPTIMAL' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {line.staffing_level}
                      </span>
                    </td>
                    <td className="p-4">
                      {line.workforce_alert_status === 'ACTIVE' ? (
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold inline-block w-max border border-red-200">
                            {line.workforce_alert_status}
                          </span>
                          <span className="text-[10px] text-gray-500 italic">Requires production-team review</span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {line.workforce_alert_status}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-gray-900">{formatEfficiency(line.predicted_efficiency)}</td>
                    <td className="p-4 font-semibold text-gray-600">{formatEfficiency(line.target_efficiency)}</td>
                    <td className="p-4 text-right flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                      {alert && (
                        <button 
                          onClick={() => handleAcknowledge(alert.alert_id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200 rounded text-xs font-medium"
                        >
                          <CheckCircle className="w-3 h-3" /> Acknowledge
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/c4/line/${line.line_id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium text-gray-700"
                      >
                        <ActivitySquare className="w-3 h-3 text-purple-500" /> View Line Diagnostics
                      </button>
                      <button 
                        onClick={() => navigate(`/c4/allocation/${line.line_id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded text-xs font-medium"
                      >
                        <Eye className="w-3 h-3 text-blue-500" /> Open Allocation Review
                      </button>
                      <button 
                        onClick={() => handleCreateReviewAction(line.line_id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium text-gray-700"
                      >
                        <Users className="w-3 h-3" /> Create Workforce Review Action
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredLines.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">No lines found.</td>
                </tr>
              )}
            </tbody>
          </table>
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
