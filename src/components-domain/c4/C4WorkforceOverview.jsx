import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { Search, Activity, FileSpreadsheet, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export default function C4WorkforceOverview() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [runs, setRuns] = useState([]);
  const [summary, setSummary] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [runsData, summaryData] = await Promise.all([
          loadDemoJson('c4/runs.json'),
          loadDemoJson('c4/summary.json')
        ]);
        setRuns(runsData);
        setSummary(summaryData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading Workforce Intelligence data..." />;
  if (error) return <ErrorState title="Failed to load C4 data" message={error} />;

  const filteredRuns = runs.filter(run => {
    const matchesSearch = 
      run.run_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      run.line_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.style_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.shift.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = filterRisk === 'ALL' || run.risk_level === filterRisk;
    const matchesStatus = filterStatus === 'ALL' || run.allocation_status === filterStatus;
    
    return matchesSearch && matchesRisk && matchesStatus;
  });

  const totalRuns = runs.length;
  const pendingRuns = runs.filter(r => r.allocation_status === 'PENDING').length;
  const approvedRuns = runs.filter(r => r.allocation_status === 'APPROVED').length;
  const highRiskRuns = runs.filter(r => r.risk_level === 'HIGH').length;

  const avgProductivity = runs.reduce((acc, r) => acc + r.predicted_productivity, 0) / (runs.length || 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageHeader 
            title="Production Workforce Intelligence" 
            description="Decision-support dashboard for workforce allocation and productivity prediction." 
          />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/c4/model-validation')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            <Activity className="w-4 h-4" /> Open Model Validation
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Available Workers</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{summary?.total_operators || 185}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Avg Predicted Prod.</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{(avgProductivity * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium flex items-center gap-1"><ShieldAlert className="w-4 h-4 text-red-500"/> High Risk Alerts</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{highRiskRuns}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-200 bg-orange-50">
          <p className="text-sm text-orange-700 font-medium flex items-center gap-1"><Clock className="w-4 h-4"/> Pending Decisions</p>
          <p className="text-2xl font-bold text-orange-900 mt-1">{pendingRuns}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200 bg-green-50">
          <p className="text-sm text-green-700 font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Approved Allocations</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{approvedRuns}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search by Run ID, Line ID, Style, or Shift..."
            className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white min-w-[140px]">
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
          </select>
        </div>
        <div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white min-w-[150px]">
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
          </select>
        </div>
      </div>

      {/* Runs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-800 text-sm">Recent Analysis Runs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-white text-gray-500 border-b">
                <th className="p-4 font-medium">Run ID</th>
                <th className="p-4 font-medium">Line / Style</th>
                <th className="p-4 font-medium">Shift</th>
                <th className="p-4 font-medium text-right">Target Output</th>
                <th className="p-4 font-medium text-right">Pred. Productivity</th>
                <th className="p-4 font-medium text-center">Risk Level</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map(run => (
                <tr key={run.run_id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-blue-600">{run.run_id}</td>
                  <td className="p-4">
                    <div className="font-semibold text-gray-900">{run.line_id}</div>
                    <div className="text-xs text-gray-500">{run.style_id}</div>
                  </td>
                  <td className="p-4 text-gray-700">{run.shift}</td>
                  <td className="p-4 text-right font-medium text-gray-700">{run.target_output}</td>
                  <td className="p-4 text-right font-bold text-gray-900">
                    {(run.predicted_productivity * 100).toFixed(1)}%
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase
                      ${run.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' : 
                        run.risk_level === 'MEDIUM' ? 'bg-orange-100 text-orange-700' : 
                        'bg-green-100 text-green-700'}`}>
                      {run.risk_level}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase border
                      ${run.allocation_status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 
                        run.allocation_status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                        'bg-gray-50 text-gray-700 border-gray-200'}`}>
                      {run.allocation_status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => navigate(`/c4/run/${run.run_id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-semibold shadow-sm transition-colors"
                    >
                      {run.allocation_status === 'PENDING' ? 'Start Review' : 'View Run'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRuns.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-500">
                    No runs found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
