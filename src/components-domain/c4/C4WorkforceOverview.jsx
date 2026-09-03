import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { Search, AlertTriangle, Eye, Users, CheckCircle, Activity, UserCheck, ActivitySquare, TrendingDown } from 'lucide-react';

export default function C4WorkforceOverview() {
  const navigate = useNavigate();
  const { globalAlerts, updateAlert, savedActions, setSavedActions } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [summary, setSummary] = useState(null);
  const [c4Lines, setC4Lines] = useState([]);
  const [sharedLines, setSharedLines] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFactory, setFilterFactory] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterShift, setFilterShift] = useState('Morning');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, c4lns, sharedLns] = await loadMultipleDemoJson([
          'c4/summary.json',
          'c4/lines.json',
          'shared/lines.json'
        ]);
        setSummary(sum);
        setC4Lines(c4lns);
        setSharedLines(sharedLns);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading C4 Workforce data..." />;
  if (error) return <ErrorState title="Failed to load C4 data" message={error} />;

  // Merge c4 lines with shared lines
  const mergedLines = c4Lines.map(c4line => {
    const shared = sharedLines.find(s => s.line_id === c4line.line_id);
    return {
      ...c4line,
      factory_id: shared ? shared.factory_id : 'FAC-001',
      department: 'Sewing',
      name: shared ? shared.name : 'Unknown',
      status: shared ? shared.status : 'Unknown'
    };
  });

  const filteredLines = mergedLines.filter(line => {
    const matchesSearch = line.line_id.toLowerCase().includes(searchTerm.toLowerCase()) || line.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFactory = filterFactory === 'ALL' || line.factory_id === filterFactory;
    const matchesDept = filterDept === 'ALL' || line.department === filterDept;
    return matchesSearch && matchesFactory && matchesDept;
  });

  const handleAcknowledge = (alertId) => {
    updateAlert(alertId, 'ACKNOWLEDGED');
  };

  const handleCreateReviewAction = (lineId) => {
    const actionType = 'WORKFORCE_REVIEW';
    const exists = savedActions.some(a => 
      a.component_id === 'C4' && 
      a.entity_id === lineId && 
      a.action_type === actionType &&
      (a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
    );

    if (!exists) {
      const newAction = {
        id: `ACT-${Date.now()}`,
        component_id: 'C4',
        run_id: null,
        entity_type: 'line',
        entity_id: lineId,
        action_type: actionType,
        status: 'OPEN',
        created_at: new Date().toISOString(),
        action_route: `/c4/allocation/${lineId}`
      };
      setSavedActions([newAction, ...savedActions]);
      alert('Workforce review action created successfully. View it in the Alerts & Actions page.');
    } else {
      alert('An active workforce review action already exists for this line.');
    }
  };

  const formatEfficiency = (val) => {
    if (typeof val === 'number') return `${(val * 100).toFixed(1)}%`;
    return val;
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
    a => a.component_id === 'C4' && (a.status === 'OPEN' || a.status === 'ACKNOWLEDGED' || a.status === 'IN_REVIEW' || a.status === 'SCHEDULED')
  ).length;

  const totalLines = filteredLines.length;
  const avgPredictedEff = totalLines > 0 ? filteredLines.reduce((acc, l) => acc + l.predicted_efficiency, 0) / totalLines : 0;
  const criticalLines = filteredLines.filter(l => l.workforce_alert_status === 'ACTIVE').length;
  const totalShiftImpact = filteredLines.reduce((acc, l) => acc + (l.shift_impact || 0), 0);
  const absentOperators = summary.absent_operators || 0;

  // Fleet Health Distribution
  const healthOnTarget = filteredLines.filter(l => l.workforce_alert_status === 'NORMAL').length;
  const healthWarning = filteredLines.filter(l => l.workforce_alert_status === 'WARNING').length;
  const healthCritical = filteredLines.filter(l => l.workforce_alert_status === 'ACTIVE').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageHeader title="Workforce Intelligence (C4)" description="Review production-line workforce information and line-allocation status." />
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 w-fit">
            <UserCheck className="w-3.5 h-3.5" /> Primary Users: Production Manager / Workforce Planner / Industrial Engineer
          </div>
        </div>
        <ProvenanceBadge />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Factory</label>
          <select value={filterFactory} onChange={e => setFilterFactory(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm min-w-[150px]">
            <option value="ALL">All Factories</option>
            <option value="FAC-001">FAC-001 (Colombo)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm min-w-[150px]">
            <option value="ALL">All Departments</option>
            <option value="Sewing">Sewing</option>
            <option value="Cutting">Cutting</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Shift / Date</label>
          <select value={filterShift} onChange={e => setFilterShift(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm min-w-[150px]">
            <option value="Morning">Morning Shift (Today)</option>
            <option value="Evening">Evening Shift (Today)</option>
            <option value="Night">Night Shift (Today)</option>
          </select>
        </div>
        <div className="flex-1"></div>
        <button 
          className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded text-sm font-medium hover:bg-gray-200"
          onClick={() => { /* Deterministic refresh */ }}
        >
          <Activity className="w-4 h-4" /> Run Fleet AI Scan
        </button>
      </div>

      {/* KPIs directly from summary.json and derived */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Total Active Lines</p>
          <p className="text-2xl font-bold mt-1">{totalLines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Avg Predicted Eff</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatEfficiency(avgPredictedEff)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Critical Bottlenecks</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{criticalLines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium flex items-center gap-1">Est. Output Loss</p>
          <p className="text-2xl font-bold text-red-600 mt-1 flex items-center gap-1">
            <TrendingDown className="w-5 h-5" /> {totalShiftImpact} units
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Absent Operators</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{absentOperators}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-700 font-medium">Open Workforce Actions</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{localOpenActions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Health Distribution Chart */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-4 text-sm">Fleet Health Status Distribution</h3>
          <div className="flex-1 flex flex-col justify-center space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600 font-medium">
                <span>On-Target ({healthOnTarget})</span>
                <span>{totalLines > 0 ? Math.round((healthOnTarget/totalLines)*100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: `${totalLines > 0 ? (healthOnTarget/totalLines)*100 : 0}%`}}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600 font-medium">
                <span>Warning ({healthWarning})</span>
                <span>{totalLines > 0 ? Math.round((healthWarning/totalLines)*100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{width: `${totalLines > 0 ? (healthWarning/totalLines)*100 : 0}%`}}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600 font-medium">
                <span>Critical Bottleneck ({healthCritical})</span>
                <span>{totalLines > 0 ? Math.round((healthCritical/totalLines)*100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{width: `${totalLines > 0 ? (healthCritical/totalLines)*100 : 0}%`}}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Target vs Predicted Efficiency by Line Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4 text-sm">Target vs Predicted Efficiency by Line</h3>
          <div className="space-y-4">
            {filteredLines.slice(0, 5).map(line => (
              <div key={line.line_id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2 text-xs font-bold text-gray-700">{line.line_id}</div>
                <div className="col-span-8 relative h-6 bg-gray-100 rounded">
                  {/* Predicted */}
                  <div 
                    className={`absolute top-0 left-0 h-full rounded flex items-center px-2 text-[10px] text-white font-bold ${
                      line.predicted_efficiency >= line.target_efficiency ? 'bg-green-500' : 'bg-orange-400'
                    }`} 
                    style={{width: `${line.predicted_efficiency * 100}%`, zIndex: 10}}
                  >
                    Pred: {formatEfficiency(line.predicted_efficiency)}
                  </div>
                  {/* Target line indicator */}
                  <div 
                    className="absolute top-0 h-full border-l-2 border-gray-800" 
                    style={{left: `${line.target_efficiency * 100}%`, zIndex: 20}}
                    title={`Target: ${formatEfficiency(line.target_efficiency)}`}
                  ></div>
                </div>
                <div className="col-span-2 text-[10px] text-gray-500 font-medium">Tgt: {formatEfficiency(line.target_efficiency)}</div>
              </div>
            ))}
            {filteredLines.length > 5 && (
              <p className="text-xs text-gray-400 italic text-center pt-2">Showing top 5 lines. View all in table below.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 mt-6">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search by Line ID or Name..."
            className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => navigate('/alerts')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          <Activity className="w-4 h-4" /> Open Alerts & Actions
        </button>
      </div>

      {/* Lines Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b">
                <th className="p-3 font-medium">Line ID</th>
                <th className="p-3 font-medium">Current Style</th>
                <th className="p-3 font-medium">Target Eff</th>
                <th className="p-3 font-medium">Predicted Eff</th>
                <th className="p-3 font-medium">Efficiency Status</th>
                <th className="p-3 font-medium">WIP</th>
                <th className="p-3 font-medium">Active Ops</th>
                <th className="p-3 font-medium">Shift Impact</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLines.map(line => {
                const alert = globalAlerts.find(a => a.component_id === 'C4' && a.entity_id === line.line_id && a.status === 'OPEN');
                const isCritical = line.workforce_alert_status === 'ACTIVE';
                
                return (
                  <tr key={line.line_id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-bold text-blue-600">{line.line_id}</td>
                    <td className="p-3 font-medium text-gray-800">{line.current_style || 'Unknown'}</td>
                    <td className="p-3 font-semibold text-gray-600">{formatEfficiency(line.target_efficiency)}</td>
                    <td className={`p-3 font-bold ${isCritical ? 'text-red-600' : 'text-green-600'}`}>
                      {formatEfficiency(line.predicted_efficiency)}
                    </td>
                    <td className="p-3">
                      {isCritical ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold border border-red-200 uppercase">Bottleneck</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold border border-green-200 uppercase">On Track</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-700">{line.wip !== undefined ? line.wip : '-'}</td>
                    <td className="p-3 text-gray-700">{line.active_operators !== undefined ? line.active_operators : '-'}</td>
                    <td className="p-3 text-red-600 font-medium">{line.shift_impact ? `-${line.shift_impact} units` : '-'}</td>
                    <td className="p-3 text-right flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/c4/line/${line.line_id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium text-gray-700"
                      >
                        <ActivitySquare className="w-3 h-3 text-purple-500" /> Inspect Diagnostics
                      </button>
                      <button 
                        onClick={() => navigate(`/c4/allocation/${line.line_id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded text-xs font-medium"
                      >
                        <Eye className="w-3 h-3 text-blue-500" /> Allocation Review
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredLines.length === 0 && (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-gray-500">No lines found.</td>
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
          <li>Workforce forecasts are fixed precomputed demonstration outputs.</li>
          <li>Model attributions do not prove operational or employee-level causation.</li>
          <li>Extended operator skill profiles are synthetic demonstration data.</li>
          <li>Allocation candidates are precomputed demonstration candidates.</li>
          <li>Simulated gains are not guaranteed productivity results.</li>
          <li>No live HR, attendance, production or skill-matrix system is connected.</li>
          <li>Human approval and factory validation are required.</li>
        </ul>
      </div>
    </div>
  );
}
