import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import PageHeader from '../../shared/components/PageHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { ShieldAlert, Activity, CheckCircle, Database } from 'lucide-react';

export default function C4ModelValidation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const valData = await loadDemoJson('c4/model_validation.json');
        setData(valData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading Model Validation data..." />;
  if (error) return <ErrorState title="Failed to load model validation" message={error} />;

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Component 4: Model Validation" 
          description="Research dashboard comparing machine learning model performance for workforce productivity prediction." 
        />
        <button 
          onClick={() => navigate('/c4')}
          className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Back to C4 Overview
        </button>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 flex gap-4">
        <Database className="w-8 h-8 text-indigo-500 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-indigo-900">Current Production Model: <span className="text-blue-700">{data.selected_model}</span></h3>
          <p className="text-sm text-indigo-700 mt-1">
            Last Updated: {new Date(data.last_updated).toLocaleString()} <br/>
            This model powers the productivity predictions in the operational dashboard. 
            All alternative models run in shadow mode for research validation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* R-Squared Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">R² Score (Higher is Better)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.models} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 500}} />
                <YAxis domain={[0, 1]} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="r2" name="R² Score" radius={[4, 4, 0, 0]} barSize={40}>
                  {data.models.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.validation_status === 'APPROVED' ? '#10b981' : '#9ca3af'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MAE Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Mean Absolute Error (Lower is Better)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.models} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 500}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="mae" name="MAE" radius={[4, 4, 0, 0]} barSize={40}>
                  {data.models.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.validation_status === 'APPROVED' ? '#10b981' : '#f87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Model Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Model Evaluation Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-white text-gray-500 border-b">
                <th className="p-4 font-medium">Model Architecture</th>
                <th className="p-4 font-medium">Validation Status</th>
                <th className="p-4 font-medium text-right">R² Score</th>
                <th className="p-4 font-medium text-right">MAE</th>
                <th className="p-4 font-medium text-right">RMSE</th>
                <th className="p-4 font-medium text-right">Train Time (s)</th>
                <th className="p-4 font-medium">Research Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.models.map(model => (
                <tr key={model.name} className={`border-b hover:bg-gray-50 ${model.validation_status === 'APPROVED' ? 'bg-green-50/30' : ''}`}>
                  <td className="p-4 font-bold text-gray-800">{model.name}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase border
                      ${model.validation_status === 'APPROVED' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {model.validation_status === 'APPROVED' ? <CheckCircle className="w-3 h-3"/> : <ShieldAlert className="w-3 h-3"/>}
                      {model.validation_status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-medium">{model.r2.toFixed(3)}</td>
                  <td className="p-4 text-right font-medium">{model.mae.toFixed(3)}</td>
                  <td className="p-4 text-right font-medium">{model.rmse.toFixed(3)}</td>
                  <td className="p-4 text-right text-gray-500">{model.training_time_sec.toFixed(1)}</td>
                  <td className="p-4 text-gray-600 italic text-xs max-w-xs">{model.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
