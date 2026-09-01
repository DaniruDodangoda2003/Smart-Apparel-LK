import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { Search, AlertTriangle, Eye, Activity, CheckCircle, UserCheck, AlertCircle } from 'lucide-react';

export default function C3FleetOverview() {
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [summary, setSummary] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [machines, setMachines] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, preds, machs] = await loadMultipleDemoJson([
          'c3/summary.json',
          'c3/predictions.json',
          'shared/machines.json'
        ]);
        setSummary(sum);
        setPredictions(preds);
        setMachines(machs);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading C3 Fleet data..." />;
  if (error) return <ErrorState title="Failed to load C3 data" message={error} />;

  // Merge predictions with machines
  const mergedPredictions = predictions.map(pred => {
    const machine = machines.find(m => m.machine_id === pred.machine_id);
    return {
      ...pred,
      status: machine ? machine.status : 'Not available in the current demo fixture.'
    };
  });

  const filteredPredictions = mergedPredictions.filter(pred => 
    pred.machine_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pred.display_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAcknowledge = (alertId) => {
    updateAlert(alertId, 'ACKNOWLEDGED');
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
    a => a.component_id === 'C3' && (a.status === 'OPEN' || a.status === 'ACKNOWLEDGED' || a.status === 'IN_REVIEW' || a.status === 'SCHEDULED')
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <PageHeader title="Predictive Maintenance Intelligence (C3)" description="Review predicted maintenance risks across the machine fleet." />
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 w-fit">
            <UserCheck className="w-3.5 h-3.5" /> Primary User: Maintenance Manager / Supervisor
          </div>
        </div>
        <ProvenanceBadge />
      </div>

      {/* KPIs directly from summary.json and local context */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Active Machines</p>
          <p className="text-2xl font-bold mt-1">{summary.active_machines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Critical Risk Machines</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary.critical_risk_machines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Warning Risk Machines</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{summary.warning_risk_machines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Pending Maintenance Actions (Fixture)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.maintenance_actions_pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Local Open Maintenance Actions</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{localOpenActions}</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search by Machine ID or Code..."
            className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => navigate('/c3/actions')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          <Activity className="w-4 h-4" /> Open Maintenance Actions
        </button>
      </div>

      {/* Predictions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Official Machine Prediction Records</h3>
            <p className="text-xs text-gray-500">
              Machines with precomputed C3 prediction records: {predictions.length} of {summary.active_machines} active machines
            </p>
          </div>
          <button 
            onClick={() => navigate('/c3/machine/MAC-0045')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 rounded-md text-xs font-semibold"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> View Synthetic Limited-Data Demo Scenario (MAC-0045)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b">
                <th className="p-4 font-medium">Machine ID</th>
                <th className="p-4 font-medium">Display Code</th>
                <th className="p-4 font-medium">Factory / Line</th>
                <th className="p-4 font-medium">Machine Type</th>
                <th className="p-4 font-medium">Maintenance Priority</th>
                <th className="p-4 font-medium">Maintenance Status</th>
                <th className="p-4 font-medium">Data Sufficiency</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.map(pred => {
                // Find alert if any exists for this machine_id
                const alert = globalAlerts.find(a => a.component_id === 'C3' && a.entity_id === pred.machine_id && a.status === 'OPEN');
                
                return (
                  <tr key={pred.machine_id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium text-blue-600">{pred.machine_id}</td>
                    <td className="p-4">{pred.display_code}</td>
                    <td className="p-4">{pred.factory_id} / {pred.line_id}</td>
                    <td className="p-4 text-gray-400 italic">Not available in the current demo fixture.</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        pred.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : 
                        pred.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' : 
                        pred.priority === 'WARNING' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-gray-100 text-gray-700'}`}>
                        {pred.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      {pred.status === 'Not available in the current demo fixture.' ? (
                        <span className="text-gray-400 italic text-xs">{pred.status}</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {pred.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-200">
                        {pred.data_sufficiency}
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      {alert && (
                        <button 
                          onClick={() => handleAcknowledge(alert.alert_id)}
                          className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium"
                        >
                          <CheckCircle className="w-3 h-3" /> Acknowledge
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/c3/machine/${pred.machine_id}`)}
                        className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium"
                      >
                        <Eye className="w-3 h-3" /> View Machine
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredPredictions.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-500">No machine predictions found.</td>
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
          <li>The displayed prediction is a fixed precomputed demonstration output.</li>
          <li>No live machine-learning inference is executed in the browser.</li>
          <li>No live sensor or machine telemetry is connected.</li>
          <li>Risk drivers are model-attributed contributors, not proof of physical causality.</li>
          <li>Physical maintenance inspection is required.</li>
          <li>Production deployment requires real maintenance history, sensor integration, model validation and factory approval.</li>
        </ul>
      </div>
    </div>
  );
}
