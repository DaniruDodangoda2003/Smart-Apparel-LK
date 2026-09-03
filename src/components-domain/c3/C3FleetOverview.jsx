import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import {
  Search, Eye, Activity, Info, AlertCircle, ChevronDown, ChevronRight,
  Filter, Clock, Plus
} from 'lucide-react';

// Priority severity rank for sorting (lower = higher severity)
const PRIORITY_RANK = {
  CRITICAL: 0,
  MANUAL_REVIEW: 1,
  HIGH: 2,
  WARNING: 3,
  MEDIUM: 4,
  LOW: 5,
  MONITOR: 6
};

function formatRisk(val) {
  return typeof val === 'number' ? `${Math.round(val * 100)}%` : '—';
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getRiskColor(val) {
  if (!val && val !== 0) return 'text-gray-400';
  if (val >= 0.7) return 'text-red-600 font-bold';
  if (val >= 0.5) return 'text-orange-600 font-semibold';
  if (val >= 0.3) return 'text-amber-600 font-semibold';
  return 'text-green-700 font-medium';
}

function getPriorityStyle(state) {
  switch (state) {
    case 'CRITICAL':      return 'bg-red-100 text-red-700 border-red-200';
    case 'MANUAL_REVIEW': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'HIGH':          return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'WARNING':       return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'MEDIUM':        return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'MONITOR':       return 'bg-sky-50 text-sky-700 border-sky-200';
    default:              return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function getSufficiencyStyle(suff) {
  if (suff === 'GOOD') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function getActionStatusStyle(status) {
  switch (status) {
    case 'OPEN':        return 'bg-blue-50 text-blue-700';
    case 'SCHEDULED':   return 'bg-purple-50 text-purple-700';
    case 'IN_PROGRESS': return 'bg-yellow-50 text-yellow-700';
    case 'COMPLETED':   return 'bg-green-50 text-green-700';
    case 'CANCELLED':   return 'bg-gray-100 text-gray-500';
    default:            return '';
  }
}

export default function C3FleetOverview() {
  const navigate = useNavigate();
  const { savedActions } = useAppContext();

  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [summary, setSummary]         = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [machines, setMachines]       = useState([]);
  const [limitedScenarios, setLimitedScenarios] = useState([]);
  const [protoInfoOpen, setProtoInfoOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterFactory, setFilterFactory]     = useState('ALL');
  const [filterLine, setFilterLine]           = useState('ALL');
  const [filterType, setFilterType]           = useState('ALL');
  const [filterPriority, setFilterPriority]   = useState('ALL');
  const [filterSufficiency, setFilterSufficiency] = useState('ALL');
  const [filterActionStatus, setFilterActionStatus] = useState('ALL');

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
  if (error)   return <ErrorState title="Failed to load fleet data" message={error} />;

  // Merge predictions + limited scenarios (no duplicates)
  const allPredictionRecords = [
    ...predictions,
    ...limitedScenarios.filter(ls => !predictions.some(p => p.machine_id === ls.machine_id))
  ];

  // Build unified fleet with machine metadata
  const unifiedFleet = allPredictionRecords.map((pred, idx) => {
    const machine = machines.find(m => m.machine_id === pred.machine_id);
    // Normalise priority label for display
    const displayPriority = pred.data_sufficiency === 'LIMITED' ? 'MANUAL_REVIEW' : pred.priority;

    // Find latest non-completed C3 action for this machine
    const machineActions = savedActions.filter(
      a => a.component_id === 'C3' && a.machine_id === pred.machine_id
    );
    const latestAction = machineActions
      .filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      || machineActions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    return {
      ...pred,
      machine_type: machine?.machine_type || '—',
      machine_status: machine?.status || '—',
      displayPriority,
      latestAction: latestAction || null
    };
  });

  // Default sort: priority severity first, then 14D risk desc
  const sortedFleet = [...unifiedFleet].sort((a, b) => {
    const pA = PRIORITY_RANK[a.displayPriority] ?? 99;
    const pB = PRIORITY_RANK[b.displayPriority] ?? 99;
    if (pA !== pB) return pA - pB;
    return (b.risk_14d || 0) - (a.risk_14d || 0);
  });

  // Get unique filter options
  const factories   = [...new Set(sortedFleet.map(m => m.factory_id).filter(Boolean))];
  const lines       = [...new Set(sortedFleet.map(m => m.line_id).filter(Boolean))].sort();
  const machineTypes = [...new Set(sortedFleet.map(m => m.machine_type).filter(v => v !== '—'))].sort();
  const priorities  = ['CRITICAL', 'MANUAL_REVIEW', 'HIGH', 'WARNING', 'MEDIUM', 'MONITOR', 'LOW'];
  const actionStatuses = ['OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  // Apply filters
  const filteredFleet = sortedFleet.filter(m => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      m.machine_id.toLowerCase().includes(term) ||
      m.display_code.toLowerCase().includes(term) ||
      (m.machine_type && m.machine_type.toLowerCase().includes(term)) ||
      (m.line_id && m.line_id.toLowerCase().includes(term));

    const matchFactory    = filterFactory    === 'ALL' || m.factory_id === filterFactory;
    const matchLine       = filterLine       === 'ALL' || m.line_id === filterLine;
    const matchType       = filterType       === 'ALL' || m.machine_type === filterType;
    const matchPriority   = filterPriority   === 'ALL' || m.displayPriority === filterPriority;
    const matchSuff       = filterSufficiency === 'ALL' || m.data_sufficiency === filterSufficiency;
    const matchAction     = filterActionStatus === 'ALL' ||
      (filterActionStatus === 'NONE'
        ? !m.latestAction
        : m.latestAction?.status === filterActionStatus);

    return matchSearch && matchFactory && matchLine && matchType && matchPriority && matchSuff && matchAction;
  });

  // KPI calculations from live fleet data
  const highCriticalCount = unifiedFleet.filter(
    m => m.displayPriority === 'CRITICAL' || m.displayPriority === 'HIGH'
  ).length;
  const manualReviewCount = unifiedFleet.filter(m => m.displayPriority === 'MANUAL_REVIEW').length;
  const openActions = savedActions.filter(
    a => a.component_id === 'C3' && (a.status === 'OPEN' || a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS')
  ).length;

  const hasActiveFilters = filterFactory !== 'ALL' || filterLine !== 'ALL' || filterType !== 'ALL' ||
    filterPriority !== 'ALL' || filterSufficiency !== 'ALL' || filterActionStatus !== 'ALL' || searchTerm;

  const clearFilters = () => {
    setFilterFactory('ALL');
    setFilterLine('ALL');
    setFilterType('ALL');
    setFilterPriority('ALL');
    setFilterSufficiency('ALL');
    setFilterActionStatus('ALL');
    setSearchTerm('');
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <PageHeader
            title="Machine Risk Overview"
            description="Predictive Maintenance · Fleet-level decision support"
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>Factory: <span className="font-semibold text-gray-700">FAC-001</span></span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last Fleet Scan: <span className="font-semibold text-gray-700 ml-1">{formatDateTime(summary.last_fleet_scan)}</span>
            </span>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-200 font-medium">
          <Info className="w-3.5 h-3.5" />
          DEMO_PRECOMPUTED · Synthetic demonstration output
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Machines Monitored',         value: unifiedFleet.length,            color: 'text-gray-900'   },
          { label: 'High / Critical Risk',        value: highCriticalCount,              color: 'text-red-600'    },
          { label: 'Manual Review Cases',         value: manualReviewCount,              color: 'text-amber-600'  },
          { label: 'Scheduled / Pending Actions', value: openActions,                    color: 'text-purple-600' },
          { label: 'Open Maintenance Actions',    value: savedActions.filter(a => a.component_id === 'C3' && a.status === 'OPEN').length, color: 'text-blue-600' }
        ].map(kpi => (
          <div key={kpi.label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium leading-tight">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="ml-auto text-xs text-blue-600 hover:underline">
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* Search */}
          <div className="relative md:col-span-2 lg:col-span-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search machine..."
              className="pl-7 pr-3 py-1.5 w-full border border-gray-300 rounded-md text-xs"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Factory */}
          <select
            value={filterFactory}
            onChange={e => setFilterFactory(e.target.value)}
            className="py-1.5 px-2 border border-gray-300 rounded-md text-xs"
          >
            <option value="ALL">All Factories</option>
            {factories.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {/* Line */}
          <select
            value={filterLine}
            onChange={e => setFilterLine(e.target.value)}
            className="py-1.5 px-2 border border-gray-300 rounded-md text-xs"
          >
            <option value="ALL">All Lines</option>
            {lines.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Machine Type */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="py-1.5 px-2 border border-gray-300 rounded-md text-xs"
          >
            <option value="ALL">All Types</option>
            {machineTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Priority */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="py-1.5 px-2 border border-gray-300 rounded-md text-xs"
          >
            <option value="ALL">All Priorities</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Data Sufficiency */}
          <select
            value={filterSufficiency}
            onChange={e => setFilterSufficiency(e.target.value)}
            className="py-1.5 px-2 border border-gray-300 rounded-md text-xs"
          >
            <option value="ALL">All Sufficiency</option>
            <option value="GOOD">GOOD</option>
            <option value="LIMITED">LIMITED</option>
          </select>

          {/* Action Status */}
          <select
            value={filterActionStatus}
            onChange={e => setFilterActionStatus(e.target.value)}
            className="py-1.5 px-2 border border-gray-300 rounded-md text-xs"
          >
            <option value="ALL">All Action Status</option>
            <option value="NONE">No Action</option>
            {actionStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Machine Prediction Records</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {filteredFleet.length} of {unifiedFleet.length} machines shown
              {hasActiveFilters && ' · Filters applied'}
            </p>
          </div>
          <button
            onClick={() => navigate('/c3/actions')}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700"
          >
            <Activity className="w-3.5 h-3.5" /> Maintenance Actions
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b text-xs">
                <th className="p-3 font-semibold w-10">#</th>
                <th className="p-3 font-semibold">Machine</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Line</th>
                <th className="p-3 font-semibold text-center">7D Risk</th>
                <th className="p-3 font-semibold text-center">14D Risk</th>
                <th className="p-3 font-semibold text-center">30D Risk</th>
                <th className="p-3 font-semibold text-center">Data Sufficiency</th>
                <th className="p-3 font-semibold text-center">Priority / State</th>
                <th className="p-3 font-semibold text-center">Action Status</th>
                <th className="p-3 font-semibold text-center">Last Scored</th>
                <th className="p-3 font-semibold text-right">Analysis</th>
              </tr>
            </thead>
            <tbody>
              {filteredFleet.map((m, idx) => (
                <tr key={m.machine_id} className="border-b hover:bg-gray-50/60 transition-colors">
                  {/* Rank */}
                  <td className="p-3 text-xs font-mono text-gray-400">{idx + 1}</td>

                  {/* Machine ID */}
                  <td className="p-3">
                    <div className="font-semibold text-gray-900 text-sm">{m.display_code}</div>
                    <div className="text-[11px] text-gray-400">{m.machine_id}</div>
                  </td>

                  {/* Type */}
                  <td className="p-3 text-xs text-gray-600">{m.machine_type}</td>

                  {/* Line */}
                  <td className="p-3 text-xs text-gray-600">{m.line_id}</td>

                  {/* Risk columns */}
                  <td className={`p-3 text-center text-sm ${getRiskColor(m.risk_7d)}`}>{formatRisk(m.risk_7d)}</td>
                  <td className={`p-3 text-center text-sm ${getRiskColor(m.risk_14d)}`}>{formatRisk(m.risk_14d)}</td>
                  <td className={`p-3 text-center text-sm ${getRiskColor(m.risk_30d)}`}>{formatRisk(m.risk_30d)}</td>

                  {/* Data Sufficiency */}
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getSufficiencyStyle(m.data_sufficiency)}`}>
                      {m.data_sufficiency}
                    </span>
                  </td>

                  {/* Priority / Decision State */}
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getPriorityStyle(m.displayPriority)}`}>
                      {m.displayPriority}
                    </span>
                  </td>

                  {/* Action Status */}
                  <td className="p-3 text-center">
                    {m.latestAction ? (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getActionStatusStyle(m.latestAction.status)}`}>
                        {m.latestAction.status}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </td>

                  {/* Last Scored */}
                  <td className="p-3 text-center text-[11px] text-gray-400 whitespace-nowrap">
                    {m.scored_at ? formatDateTime(m.scored_at) : '—'}
                  </td>

                  {/* View Analysis */}
                  <td className="p-3 text-right">
                    <button
                      onClick={() => navigate(`/c3/machine/${m.machine_id}`)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium ml-auto"
                    >
                      <Eye className="w-3 h-3" /> View Analysis
                    </button>
                  </td>
                </tr>
              ))}
              {filteredFleet.length === 0 && (
                <tr>
                  <td colSpan="12" className="p-10 text-center">
                    <div className="text-gray-400">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No machines match current filters</p>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 hover:underline">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* About this prototype */}
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
            <p>• All risk scores and predictions are <strong>DEMO_PRECOMPUTED synthetic demonstration outputs</strong>.</p>
            <p>• No live model inference runs in the browser. No live machine telemetry is connected.</p>
            <p>• Model-attributed risk drivers are not proof of physical root cause.</p>
            <p>• A machine with LIMITED data sufficiency is assigned MANUAL_REVIEW — risk score alone does not auto-escalate priority.</p>
            <p>• Physical maintenance inspection is required for any identified maintenance need.</p>
            <p>• Final deployment requires real maintenance-history data, model validation, and factory approval.</p>
          </div>
        )}
      </div>
    </div>
  );
}
