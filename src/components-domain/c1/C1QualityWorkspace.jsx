import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import { loadLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { Search, AlertTriangle, Eye, BarChart2, CheckCircle2, UserCheck, Image as ImageIcon, Video, Filter } from 'lucide-react';

export default function C1QualityWorkspace() {
  const navigate = useNavigate();
  const { globalAlerts, updateAlert } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [summary, setSummary] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [c1State] = useState(() => loadLocal('smartapparel.c1.state', { defaultModel: 'model_yolov8n' }));

  // Compact filters
  const [filters, setFilters] = useState({
    date: '', line: '', machine: '', defectClass: '', sourceType: '', reviewStatus: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, insps, evals] = await Promise.all([
          loadDemoJson('c1/summary.json'),
          loadDemoJson('c1/inspections.json'),
          loadDemoJson('c1/model_evaluations.json').catch(() => [])
        ]);
        setSummary(sum);
        setInspections(insps);
        setEvaluations(evals);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading C1 Quality data..." />;
  if (error) return <ErrorState title="Failed to load C1 data" message={error} />;

  // Filter based on search term and compact filters
  const filteredInspections = inspections.filter(insp => {
    const matchSearch = insp.inspection_id.toLowerCase().includes(searchTerm.toLowerCase()) || insp.roll_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLine = filters.line ? insp.line_id === filters.line : true;
    const matchMachine = filters.machine ? insp.machine_id === filters.machine : true;
    const matchDefect = filters.defectClass ? insp.defect_categories?.includes(filters.defectClass) : true;
    return matchSearch && matchLine && matchMachine && matchDefect;
  });

  const handleAcknowledge = (alertId) => {
    updateAlert(alertId, 'ACKNOWLEDGED');
  };

  const defaultModelName = evaluations.find(m => m.id === c1State.defaultModel)?.name || 'YOLOv8n (Default)';
  
  // Calculate most frequent defect
  const defectCounts = {};
  inspections.forEach(i => {
    i.defect_categories?.forEach(d => {
      defectCounts[d] = (defectCounts[d] || 0) + 1;
    });
  });
  const mostFrequentDefect = Object.keys(defectCounts).length > 0 
    ? Object.keys(defectCounts).reduce((a, b) => defectCounts[a] > defectCounts[b] ? a : b) 
    : 'None';

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
          <PageHeader title="Fabric Quality Intelligence (C1)" description="Review recorded fabric inspections and quality indicators." />
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 w-fit">
            <UserCheck className="w-3.5 h-3.5" /> Primary Users: Quality Manager / Fabric Inspector
          </div>
        </div>
        <ProvenanceBadge />
      </div>

      <div className="bg-blue-50 text-blue-900 px-4 py-2 rounded flex justify-between items-center text-sm border border-blue-100">
        <span className="font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Default Inspection Model: {defaultModelName}</span>
        <button onClick={() => navigate('/c1/analytics')} className="text-blue-700 underline text-xs">Change Model</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Inspections</p>
          <p className="text-xl font-bold mt-1">{filteredInspections.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Defect Events</p>
          <p className="text-xl font-bold text-orange-600 mt-1">{filteredInspections.reduce((sum, i) => sum + i.events, 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Critical Events</p>
          <p className="text-xl font-bold text-red-600 mt-1">{filteredInspections.filter(i => i.severity === 'HIGH').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Pending Review</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{summary.pending_review_count}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Most Affected</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{summary.most_affected_line}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Top Defect</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{mostFrequentDefect}</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search by ID or Roll..."
              className="pl-9 pr-4 py-1.5 w-full border border-gray-300 rounded text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/c1/history')} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 border border-gray-300">History & Reports</button>
            <button onClick={() => navigate('/c1/analytics')} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
              <BarChart2 className="w-4 h-4" /> Analytics
            </button>
          </div>
        </div>
        
        {/* Compact Filters */}
        <div className="flex flex-wrap gap-3 items-center text-xs">
          <span className="font-bold text-gray-500 flex items-center gap-1"><Filter className="w-3 h-3"/> Filters:</span>
          <select value={filters.date} onChange={e=>setFilters({...filters, date: e.target.value})} className="border border-gray-300 rounded p-1">
            <option value="">All Dates</option>
            <option value="today">Today</option>
          </select>
          <select value={filters.line} onChange={e=>setFilters({...filters, line: e.target.value})} className="border border-gray-300 rounded p-1">
            <option value="">All Lines</option>
            <option value="LINE-03">LINE-03</option>
          </select>
          <select value={filters.machine} onChange={e=>setFilters({...filters, machine: e.target.value})} className="border border-gray-300 rounded p-1">
            <option value="">All Machines</option>
            <option value="MAC-005">MAC-005</option>
          </select>
          <select value={filters.defectClass} onChange={e=>setFilters({...filters, defectClass: e.target.value})} className="border border-gray-300 rounded p-1">
            <option value="">All Defects</option>
            <option value="Hole">Hole</option>
            <option value="Stain">Stain</option>
          </select>
          <select value={filters.sourceType} onChange={e=>setFilters({...filters, sourceType: e.target.value})} className="border border-gray-300 rounded p-1">
            <option value="">All Sources</option>
            <option value="camera">Camera</option>
          </select>
          <select value={filters.reviewStatus} onChange={e=>setFilters({...filters, reviewStatus: e.target.value})} className="border border-gray-300 rounded p-1">
            <option value="">All Review Statuses</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Inspection Events Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b">
                <th className="p-3 font-medium">Event ID</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Factory / Line</th>
                <th className="p-3 font-medium">Batch / Order</th>
                <th className="p-3 font-medium">Roll ID</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.map(insp => {
                const alert = globalAlerts.find(a => a.component_id === 'C1' && a.entity_id === insp.roll_id && a.status === 'OPEN');
                return (
                  <tr key={insp.inspection_id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-blue-600">{insp.inspection_id}</td>
                    <td className="p-3 text-xs text-gray-500">{new Date(insp.date).toLocaleDateString()}</td>
                    <td className="p-3 text-xs">{insp.factory_id} / {insp.line_id}</td>
                    <td className="p-3 text-xs">{insp.batch_id} / {insp.order_id}</td>
                    <td className="p-3 text-xs font-bold">{insp.roll_id}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${insp.status === 'DEFECTIVE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {insp.status}
                      </span>
                    </td>
                    <td className="p-3 text-right flex items-center justify-end gap-1.5">
                      {alert && (
                        <button 
                          onClick={() => handleAcknowledge(alert.alert_id)}
                          className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium"
                        >
                          <AlertTriangle className="w-3 h-3" /> Acknowledge
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/c1/inspect-image?event=${insp.inspection_id}`)}
                        className="flex items-center px-2 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium text-gray-700"
                        title="Inspect Image"
                      >
                        <ImageIcon className="w-3 h-3 text-blue-500" />
                      </button>
                      <button 
                        onClick={() => navigate(`/c1/inspect-video?event=${insp.inspection_id}`)}
                        className="flex items-center px-2 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium text-gray-700"
                        title="Inspect Video"
                      >
                        <Video className="w-3 h-3 text-purple-500" />
                      </button>
                      <button 
                        onClick={() => navigate(`/c1/event/${insp.inspection_id}`)}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-xs font-medium text-gray-700"
                      >
                        <Eye className="w-3 h-3 text-gray-500" /> Details
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredInspections.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">No inspection records found.</td>
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
          <li>This prototype uses deterministic inspection records.</li>
          <li>No live fabric-inspection model is executed in the browser.</li>
          <li>Any displayed contributor is a precomputed/model-attributed result, not proof of physical causality.</li>
          <li>Physical verification by the quality team is required.</li>
        </ul>
      </div>
    </div>
  );
}
