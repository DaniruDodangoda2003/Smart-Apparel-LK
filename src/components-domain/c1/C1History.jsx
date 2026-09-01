import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { ArrowLeft, Clock } from 'lucide-react';

export default function C1History() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hist = await loadDemoJson('c1/history.json').catch(() => []);
        setHistory(hist);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading C1 History..." />;
  if (error) return <ErrorState title="Failed to load history" message={error} />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/c1')} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader title="Fabric Quality History" description="Historical synthetic demonstration data." />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <span className="inline-flex items-center gap-1 text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded">
            <Clock className="w-3 h-3" /> Derived from synthetic demonstration history data.
          </span>
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Inspection ID</th>
                  <th className="p-3 font-medium">Roll ID</th>
                  <th className="p-3 font-medium">Recorded Quality Status</th>
                  <th className="p-3 font-medium">Recorded Events</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-700">{new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString()}</td>
                    <td className="p-3 font-medium text-blue-600">{h.inspection_id}</td>
                    <td className="p-3">{h.roll_id}</td>
                    <td className="p-3">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${h.status === 'DEFECTIVE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {h.status}
                       </span>
                    </td>
                    <td className="p-3 font-semibold">{h.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic p-4 text-center bg-gray-50 rounded">Not available in the current demo fixture.</p>
        )}
      </div>
    </div>
  );
}
