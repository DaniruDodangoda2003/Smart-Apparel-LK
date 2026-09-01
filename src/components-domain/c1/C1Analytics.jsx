import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend } from 'recharts';

export default function C1Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [inspections, setInspections] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [explanations, setExplanations] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [insps, recs, exps, hists] = await Promise.all([
          loadDemoJson('c1/inspections.json'),
          loadDemoJson('c1/model_recommendations.json').catch(() => []),
          loadDemoJson('c1/explanations.json').catch(() => []),
          loadDemoJson('c1/history.json').catch(() => [])
        ]);
        setInspections(insps);
        setRecommendations(recs);
        setExplanations(exps);
        setHistory(hists);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading C1 Analytics..." />;
  if (error) return <ErrorState title="Failed to load analytics" message={error} />;

  // Prepare data for Status Distribution
  const statusCounts = inspections.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.keys(statusCounts).map(key => ({
    name: key,
    value: statusCounts[key]
  }));
  const STATUS_COLORS = { 'DEFECTIVE': '#ef4444', 'PASSED': '#22c55e' };

  // Prepare data for Events by Roll
  const rollData = inspections.map(insp => ({
    roll: insp.roll_id,
    events: insp.events
  }));

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c1')} className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <PageHeader title="Fabric Quality Analytics" description="Analysis derived from recorded inspections." />
        </div>
        <ProvenanceBadge />
      </div>

      <div className="bg-blue-50 text-blue-800 p-4 rounded text-sm font-medium border border-blue-100">
        Derived from {inspections.length} demo inspection records.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
          <h3 className="font-bold text-lg border-b pb-2 mb-4">Inspection Event Distribution</h3>
          <div className="h-64 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto mt-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Record Count</th>
                </tr>
              </thead>
              <tbody>
                {statusData.map(item => (
                  <tr key={item.name} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2 font-semibold">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Events by Roll */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
          <h3 className="font-bold text-lg border-b pb-2 mb-4">Recorded Events by Roll</h3>
          <div className="h-64 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rollData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="roll" tick={{fontSize: 12}} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="events" name="Recorded Events" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto mt-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  <th className="p-2 font-medium">Roll ID</th>
                  <th className="p-2 font-medium">Recorded Events</th>
                </tr>
              </thead>
              <tbody>
                {rollData.map(item => (
                  <tr key={item.roll} className="border-b">
                    <td className="p-2">{item.roll}</td>
                    <td className="p-2 font-semibold">{item.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-bold text-lg border-b pb-2 mb-4">Model Recommendations & Contributors</h3>
          {recommendations.length > 0 || explanations.length > 0 ? (
            <div className="space-y-4">
              <span className="inline-block text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded">Derived from demo inspection records.</span>
              
              {recommendations.map(r => (
                <div key={r.inspection_id} className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <p className="font-semibold text-gray-900 text-sm">Inspection: {r.inspection_id}</p>
                  <p className="text-gray-700 text-sm mt-1">Recommendation: <span className="font-bold">{r.recommendation}</span></p>
                  <p className="text-gray-500 text-xs italic">{r.details}</p>
                </div>
              ))}

              {explanations.map(e => (
                <div key={e.inspection_id} className="mt-4">
                  <p className="font-semibold text-gray-900 text-sm">Model-Attributed Contributors ({e.inspection_id})</p>
                  <div className="mt-2 space-y-2">
                    {e.contributors.map((c, i) => (
                      <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center text-sm">
                        <div>
                          <p className="font-bold">{c.factor}</p>
                          <p className="text-xs text-slate-500">{c.display_text}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${c.impact === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {c.impact} Impact
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <p className="text-gray-500 italic text-sm">Not available in the current demo fixture.</p>
          )}
        </div>

        {/* History */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
          <h3 className="font-bold text-lg border-b pb-2 mb-4">Demo History</h3>
          {history.length > 0 ? (
            <div className="space-y-4 flex-1">
              <span className="inline-block text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded">Derived from synthetic demonstration history data.</span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b">
                      <th className="p-2 font-medium">Date</th>
                      <th className="p-2 font-medium">Insp. ID</th>
                      <th className="p-2 font-medium">Status</th>
                      <th className="p-2 font-medium">Recorded Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{new Date(h.date).toLocaleDateString()}</td>
                        <td className="p-2">{h.inspection_id}</td>
                        <td className="p-2">
                           <span className={`px-2 py-1 rounded text-[10px] font-bold ${h.status === 'DEFECTIVE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {h.status}
                           </span>
                        </td>
                        <td className="p-2 font-semibold">{h.events}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
             <p className="text-gray-500 italic text-sm">Not available in the current demo fixture.</p>
          )}
        </div>
      </div>

      {/* Prototype Limitations Notice */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300 space-y-3">
        <h4 className="font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" /> Prototype Limitations</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>This prototype uses deterministic inspection records.</li>
          <li>No live fabric-inspection model is executed in the browser.</li>
          <li>Any displayed contributor is a precomputed/model-attributed result, not proof of physical causality.</li>
          <li>Physical verification by the quality team is required.</li>
          <li>Production deployment requires real factory data, model validation and workflow approval.</li>
        </ul>
      </div>

    </div>
  );
}
