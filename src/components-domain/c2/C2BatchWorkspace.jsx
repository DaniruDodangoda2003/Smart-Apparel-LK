import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../shared/components/PageHeader';
import DataTable from '../../shared/components/DataTable';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { loadDemoJson } from '../../shared/data/loaders';
import { UserCheck, Bell } from 'lucide-react';

export default function C2BatchWorkspace() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const ProvenanceBadge = () => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      <p className="italic">Not a live production recommendation</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageHeader 
            title="Fabric Waste Intelligence (C2)" 
            description="Select a batch run to review fabric waste intelligence scenarios." 
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
          <ProvenanceBadge />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DataTable 
          columns={[
            { header: 'Run ID', accessor: 'run_id' },
            { header: 'Batch ID', accessor: 'batch_id' },
            { header: 'Order ID', accessor: 'order_id' },
            { header: 'Style ID', accessor: 'style_id' },
            { header: 'Marker ID', accessor: 'marker_id' },
            { header: 'Risk Status', accessor: 'risk_status', cell: (row) => (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.risk_status === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                {row.risk_status}
              </span>
            )},
            { header: 'Strategy Status', accessor: 'strategy_status' },
            { header: 'Action', accessor: 'action', cell: (row) => (
              <button 
                onClick={() => navigate(`/c2/run/${row.run_id}`)}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm border border-blue-200 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors"
              >
                Open Run Review
              </button>
            )}
          ]}
          data={runs}
        />
      </div>
    </div>
  );
}
