import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { Search, Eye, Activity, CheckCircle, AlertCircle, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

// Horizon selector options
const HORIZONS = [
  { key: 'risk_7d',  label: '7 Days',  short: '7D'  },
  { key: 'risk_14d', label: '14 Days', short: '14D' },
  { key: 'risk_30d', label: '30 Days', short: '30D' }
];

export default function C3FleetOverview() {
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [summary, setSummary] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [machines, setMachines] = useState([]);
  const [limitedScenarios, setLimitedScenarios] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [protoInfoOpen, setProtoInfoOpen] = useState(false);
  // Default horizon is 30 days
  const [selectedHorizon, setSelectedHorizon] = useState('risk_30d');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, preds, machs, limited] = await loadMultipleDemoJson([
          'c3/summary.json',
          'c3/predictions.json',
          'shared/machines.json',
          'c3/limited_scenarios.json'
        ]);
        setSummary(sum);
        setPredictions(preds);
        setMachines(machs);
        setLimitedScenarios(limited);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading fleet data..." />;
  if (error) return <ErrorState title="Failed to load fleet data" message={error} />;

  // Build unified fleet: official predictions + limited scenarios (no duplicates)
  const allPredictionRecords = [
    ...predictions,
    ...limitedScenarios.filter(ls => !predictions.some(p => p.machine_id === ls.machine_id))
  ];

  const unifiedFleet = allPredictionRecords.map(pred => {
    const machine = machines.find(m => m.machine_id === pred.machine_id);
    const isLimited = pred.data_sufficiency === 'LIMITED';
    // Decision state logic: LIMITED → MANUAL REVIEW, LOW → MONITOR, else priority label
    let decision_state;
    if (isLimited) {
      decision_state = 'MANUAL REVIEW';
    } else if (pred.priority === 'LOW') {
      decision_state = 'MONITOR';
    } else {
      decision_state = pred.priority;
    }
    return {
      ...pred,
      machine_type: machine?.machine_type || '—',
      machine_status: machine?.status || '—',
      decision_state
    };
  });

  const filteredFleet = unifiedFleet.filter(m =>
    m.machine_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.display_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.machine_type && m.machine_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAcknowledge = (alertId) => {
    updateAlert(alertId, 'ACKNOWLEDGED');
  };

  // KPI: count of locally created open reviews
  const localOpenReviews = savedActions.filter(
    a => a.component_id === 'C3' && (a.status === 'OPEN' || a.status === 'ACKNOWLEDGED' || a.status === 'IN_REVIEW' || a.status === 'SCHEDULED')
  ).length;

  // Fleet risk chart — sorted by the currently selected horizon, descending
  const horizonMeta = HORIZONS.find(h => h.key === selectedHorizon) || HORIZONS[2];
  const chartData = [...unifiedFleet]
    .sort((a, b) => (b[selectedHorizon] || 0) - (a[selectedHorizon] || 0))
    .map(m => ({
      name: m.display_code,
      risk: Math.round((m[selectedHorizon] || 0) * 100),
      priority: m.priority,
      sufficiency: m.data_sufficiency
    }));

  const getRiskBarColor = (entry) => {
    if (entry.priority === 'CRITICAL') return '#dc2626';
    if (entry.priority === 'HIGH')     return '#ea580c';
    if (entry.priority === 'WARNING')  return '#d97706';
    return '#6b7280';
  };

  const getSufficiencyStyle = (suff) => {
    if (suff === 'GOOD') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const getDecisionStyle = (state) => {
    if (state === 'CRITICAL')     return 'bg-red-100 text-red-700';
    if (state === 'MANUAL REVIEW') return 'bg-amber-100 text-amber-800';
    if (state === 'HIGH')          return 'bg-orange-100 text-orange-700';
    if (state === 'WARNING')       return 'bg-yellow-100 text-yellow-700';
    if (state === 'MONITOR')       return 'bg-blue-50 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatRisk = (val) => typeof val === 'number' ? `${Math.round(val * 100)}/100` : '—';

  const totalPredicted = allPredictionRecords.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header with global provenance badge */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader
          title="Machine Risk Overview"
          description="Review predicted maintenance risks across the machine fleet."
        />
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
          <Info className="w-3.5 h-3.5 text-gray-400" />
          <span>Demo Data · Precomputed Prototype Output</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Machines Monitored</p>
          <p className="text-2xl font-bold mt-1">{summary.active_machines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Critical Attention</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary.critical_risk_machines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Warning</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{summary.warning_risk_machines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Pending Maintenance Actions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.maintenance_actions_pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Open Maintenance Reviews</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{localOpenReviews}</p>
        </div>
      </div>

      {/* Fleet Risk Chart with horizon selector */}
      {chartData.length > 0 && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="font-semibold text-gray-900 text-sm">Machine Risk Comparison</h3>
            {/* Horizon selector */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              {HORIZONS.map(h => (
                <button
                  key={h.key}
                  onClick={() => setSelectedHorizon(h.key)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    selectedHorizon === h.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: '100%', height: Math.max(chartData.length * 48, 120) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}`} fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis type="category" dataKey="name" width={56} fontSize={12} tick={{ fill: '#374151', fontWeight: 600 }} />
                <Tooltip
                  formatter={(value) => [`${value}/100`, `${horizonMeta.label} Risk Score`]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="risk" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getRiskBarColor(entry)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 text-right">
            {horizonMeta.label} precomputed maintenance risk score
          </p>
        </div>
      )}

      {/* Search + Actions bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by machine, type or code..."
            className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => navigate('/c3/actions')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          <Activity className="w-4 h-4" /> Maintenance Review Actions
        </button>
      </div>

      {/* Unified Fleet Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 text-sm">Machine Prediction Records</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalPredicted} of {summary.active_machines} active machines currently have precomputed prediction records.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b">
                <th className="p-3.5 font-medium">Machine</th>
                <th className="p-3.5 font-medium">Machine Type</th>
                <th className="p-3.5 font-medium">Line</th>
                <th className="p-3.5 font-medium text-center">Risk Horizons</th>
                <th className="p-3.5 font-medium text-center">Data Sufficiency</th>
                <th className="p-3.5 font-medium text-center">Decision State</th>
                <th className="p-3.5 font-medium text-center">Status</th>
                <th className="p-3.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredFleet.map(m => {
                const alert = globalAlerts.find(a => a.component_id === 'C3' && a.entity_id === m.machine_id && a.status === 'OPEN');
                return (
                  <tr key={m.machine_id} className="border-b hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-gray-900">{m.display_code}</div>
                      <div className="text-xs text-gray-400">{m.machine_id}</div>
                    </td>
                    <td className="p-3.5 text-gray-700">{m.machine_type}</td>
                    <td className="p-3.5 text-gray-700">{m.line_id}</td>
                    {/* Compact 3-horizon risk cell */}
                    <td className="p-3.5 text-center">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        <span className="font-medium text-gray-700">7D</span>{' '}{formatRisk(m.risk_7d)}
                        {' · '}
                        <span className="font-medium text-gray-700">14D</span>{' '}{formatRisk(m.risk_14d)}
                        {' · '}
                        <span className="font-medium text-gray-700">30D</span>{' '}{formatRisk(m.risk_30d)}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getSufficiencyStyle(m.data_sufficiency)}`}>
                        {m.data_sufficiency}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getDecisionStyle(m.decision_state)}`}>
                        {m.decision_state}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        m.machine_status === 'ACTIVE'      ? 'bg-green-50 text-green-700' :
                        m.machine_status === 'MAINTENANCE' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {m.machine_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {alert && (
                          <button
                            onClick={() => handleAcknowledge(alert.alert_id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded text-xs font-medium border border-orange-200"
                          >
                            <CheckCircle className="w-3 h-3" /> Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/c3/machine/${m.machine_id}`)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium"
                        >
                          <Eye className="w-3 h-3" /> View Machine
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredFleet.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-500">No machine predictions match the current search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collapsible About this prototype */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setProtoInfoOpen(!protoInfoOpen)}
          className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-600 font-medium"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            About this prototype
          </span>
          {protoInfoOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {protoInfoOpen && (
          <div className="px-5 py-4 bg-white text-sm text-gray-600 space-y-1.5">
            <p>• Prototype uses demo/precomputed model outputs.</p>
            <p>• No live model inference runs in the browser.</p>
            <p>• No live machine telemetry is connected.</p>
            <p>• Model-attributed risk drivers are not proof of physical root cause.</p>
            <p>• Physical maintenance inspection is required for any identified maintenance need.</p>
            <p>• Final deployment requires real maintenance-history data, model validation and factory approval.</p>
            <p>• Sensor integration may be added where suitable data and infrastructure are available; it is not a mandatory core dependency.</p>
          </div>
        )}
      </div>
    </div>
  );
}
