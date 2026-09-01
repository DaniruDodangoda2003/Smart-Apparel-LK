import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { ArrowLeft } from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend } from 'recharts';

export default function C2Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [runs, setRuns] = useState([]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rns] = await Promise.all([
          loadDemoJson('c2/runs.json')
        ]);
        setRuns(rns);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading C2 Analytics..." />;
  if (error) return <ErrorState title="Failed to load analytics" message={error} />;

  // KPI Calculations
  const totalRuns = runs.length;
  const highWasteRuns = runs.filter(r => r.risk_status === 'HIGH').length;
  const reviewRequired = runs.filter(r => r.strategy_status === 'REVIEW_REQUIRED').length;
  const approvedStrategies = runs.filter(r => r.strategy_status === 'APPROVED').length;
  
  const runsWithPredictions = runs.filter(r => typeof r.predicted_realised_waste_pct === 'number');
  const avgWaste = runsWithPredictions.length > 0 
    ? (runsWithPredictions.reduce((sum, r) => sum + r.predicted_realised_waste_pct, 0) / runsWithPredictions.length).toFixed(1)
    : null;

  // 1. Run Risk Status Distribution (Donut)
  const riskCounts = runs.reduce((acc, curr) => {
    acc[curr.risk_status] = (acc[curr.risk_status] || 0) + 1;
    return acc;
  }, {});
  const riskData = Object.keys(riskCounts).map(key => ({
    name: key,
    value: riskCounts[key],
    fill: key === 'HIGH' ? '#ef4444' : key === 'NORMAL' ? '#22c55e' : '#94a3b8'
  }));

  // 2. Predicted Waste by Run (Bar)
  const predictedWasteData = runsWithPredictions.map(r => ({
    name: r.run_id,
    waste: r.predicted_realised_waste_pct
  }));

  // 3. Strategy Status Distribution (Donut)
  const strategyCounts = runs.reduce((acc, curr) => {
    acc[curr.strategy_status] = (acc[curr.strategy_status] || 0) + 1;
    return acc;
  }, {});
  const strategyData = Object.keys(strategyCounts).map(key => ({
    name: key,
    value: strategyCounts[key],
    fill: key === 'APPROVED' ? '#22c55e' : key === 'REVIEW_REQUIRED' ? '#f59e0b' : '#3b82f6'
  }));



  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/c2')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <PageHeader title="Fabric Waste Analytics" description="Review prediction models, waste distributions, and strategy comparisons." />
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Risk Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2 mb-4">Run Risk Status Distribution</h3>
          {riskData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 font-medium">No data available</div>
          )}
        </div>

        {/* Strategy Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2 mb-4">Strategy Status Distribution</h3>
          {strategyData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={strategyData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 font-medium">No data available</div>
          )}
        </div>

        {/* Predicted Waste by Run */}
        {predictedWasteData.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-2">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2 mb-4">Predicted Waste by Run</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={predictedWasteData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} unit="%" />
                  <Tooltip cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="waste" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Predicted Waste (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}


      </div>
      
      {/* Raw Records Verification Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Raw Data Verification (runs.json)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Run ID</th>
                <th className="px-6 py-3 font-semibold">Predicted Waste</th>
                <th className="px-6 py-3 font-semibold">Risk Status</th>
                <th className="px-6 py-3 font-semibold">Strategy Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {runs.map((r) => (
                <tr key={r.run_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{r.run_id}</td>
                  <td className="px-6 py-4">{r.predicted_realised_waste_pct !== undefined ? `${r.predicted_realised_waste_pct}%` : 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      r.risk_status === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {r.risk_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      r.strategy_status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                      r.strategy_status === 'REVIEW_REQUIRED' ? 'bg-amber-100 text-amber-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {r.strategy_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
