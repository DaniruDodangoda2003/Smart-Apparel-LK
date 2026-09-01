import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../shared/components/PageHeader';
import DataTable from '../../shared/components/DataTable';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { loadDemoJson } from '../../shared/data/loaders';
import { UserCheck, Bell, Search, BarChart2, FilterX } from 'lucide-react';

export default function C2BatchWorkspace() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [strategyFilter, setStrategyFilter] = useState('ALL');

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const data = await loadDemoJson('c2/runs.json');
        setRuns(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRuns();
  }, []);

  if (loading) return <LoadingState message="Loading C2 Runs..." />;
  if (error) return <ErrorState title="Failed to load runs" message={error} />;

  // Derived KPI values from runs.json
  const totalRuns = runs.length;
  const highWasteRuns = runs.filter(r => r.risk_status === 'HIGH').length;
  const reviewRequired = runs.filter(r => r.strategy_status === 'REVIEW_REQUIRED').length;
  const approvedStrategies = runs.filter(r => r.strategy_status === 'APPROVED').length;
  
  // Average predicted waste (only if valid numbers exist)
  const runsWithPredictions = runs.filter(r => typeof r.predicted_realised_waste_pct === 'number');
  const avgWaste = runsWithPredictions.length > 0 
    ? (runsWithPredictions.reduce((sum, r) => sum + r.predicted_realised_waste_pct, 0) / runsWithPredictions.length).toFixed(1)
    : null;

  // Unique filter options
  const riskStatuses = [...new Set(runs.map(r => r.risk_status).filter(Boolean))];
  const strategyStatuses = [...new Set(runs.map(r => r.strategy_status).filter(Boolean))];

  // Apply filters
  const filteredRuns = runs.filter(r => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || (
      (r.run_id || '').toLowerCase().includes(term) ||
      (r.batch_id || '').toLowerCase().includes(term) ||
      (r.order_id || '').toLowerCase().includes(term) ||
      (r.style_id || '').toLowerCase().includes(term) ||
      (r.marker_id || '').toLowerCase().includes(term)
    );
    
    const matchesRisk = riskFilter === 'ALL' || r.risk_status === riskFilter;
    const matchesStrategy = strategyFilter === 'ALL' || r.strategy_status === strategyFilter;
    
    return matchesSearch && matchesRisk && matchesStrategy;
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setRiskFilter('ALL');
    setStrategyFilter('ALL');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageHeader 
            title="Fabric Waste Intelligence (C2)" 
            description="Review cutting-run records, waste indicators and strategy status." 
          />
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 w-fit">
            <UserCheck className="w-3.5 h-3.5" /> Primary Users: Cutting-Room Manager / CAD-Marker Planner / Production Planner
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/alerts')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Bell className="w-4 h-4" /> Open Alerts
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Total Run Records</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{totalRuns}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">High-Waste Runs</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{highWasteRuns}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Review Required</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{reviewRequired}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Approved Strategies</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{approvedStrategies}</p>
        </div>
        {avgWaste !== null && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 font-medium">Average Predicted Waste</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{avgWaste}%</p>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4 flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Run, Batch, Order, Style or Marker..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="ALL">All Risk Statuses</option>
            {riskStatuses.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
          >
            <option value="ALL">All Strategy Statuses</option>
            {strategyStatuses.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
          {(searchTerm || riskFilter !== 'ALL' || strategyFilter !== 'ALL') && (
            <button 
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FilterX className="w-4 h-4" /> Clear Filters
            </button>
          )}
        </div>
        <button 
          onClick={() => navigate('/c2/analytics')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap"
        >
          <BarChart2 className="w-4 h-4" /> Open Analytics
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-800">Analysis Run History</h3>
        </div>
        
        {filteredRuns.length > 0 ? (
          <DataTable 
            columns={[
              { header: 'Run ID', accessor: 'run_id' },
              { header: 'Batch ID', accessor: 'batch_id' },
              { header: 'Order ID', accessor: 'order_id' },
              { header: 'Style ID', accessor: 'style_id' },
              { header: 'Marker ID', accessor: 'marker_id' },
              { header: 'Risk Status', accessor: 'risk_status', cell: (row) => {
                let badgeClass = 'bg-gray-100 text-gray-700 border-gray-200';
                if (row.risk_status === 'HIGH') badgeClass = 'bg-red-100 text-red-700 border-red-200';
                if (row.risk_status === 'NORMAL') badgeClass = 'bg-green-100 text-green-700 border-green-200';
                return (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
                    {row.risk_status}
                  </span>
                );
              }},
              { header: 'Strategy Status', accessor: 'strategy_status', cell: (row) => {
                let badgeClass = 'bg-gray-100 text-gray-700 border-gray-200';
                if (row.strategy_status === 'REVIEW_REQUIRED') badgeClass = 'bg-amber-100 text-amber-700 border-amber-200';
                if (row.strategy_status === 'APPROVED') badgeClass = 'bg-green-100 text-green-700 border-green-200';
                return (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
                    {row.strategy_status}
                  </span>
                );
              }},
              { header: 'Action', accessor: 'action', cell: (row) => (
                <button 
                  onClick={() => navigate(`/c2/run/${row.run_id}`)}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm border border-blue-200 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  Open Run Review
                </button>
              )}
            ]}
            data={filteredRuns}
          />
        ) : (
          <div className="p-12 text-center text-gray-500 font-medium">
            No run records match your search.
          </div>
        )}
      </div>
    </div>
  );
}
