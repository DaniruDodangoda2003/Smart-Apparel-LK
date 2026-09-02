import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../shared/components/PageHeader';
import { 
  UserCheck, 
  BarChart2, 
  ImageIcon, 
  Video, 
  History, 
  Eye, 
  Filter, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Activity, 
  Layers
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';

// Initial precomputed prototype defect events fixture
const INITIAL_DEFECT_EVENTS = [
  { event_id: 'EVT-001', date: '2026-09-01 09:15', factory_id: 'FAC-001', line_id: 'LINE-03', machine_id: 'MC-014', defect_class: 'Stain', model_id: 'YOLOv8n', confidence: 91, review_status: 'Pending', severity: 'HIGH', source_type: 'Image' },
  { event_id: 'EVT-002', date: '2026-09-01 10:24', factory_id: 'FAC-001', line_id: 'LINE-02', machine_id: 'MC-009', defect_class: 'Cut', model_id: 'YOLOv5n', confidence: 88, review_status: 'Reviewed', severity: 'HIGH', source_type: 'Recorded Video' },
  { event_id: 'EVT-003', date: '2026-09-01 11:10', factory_id: 'FAC-001', line_id: 'LINE-03', machine_id: 'MC-014', defect_class: 'Contamination', model_id: 'YOLOv8n', confidence: 86, review_status: 'Pending', severity: 'MEDIUM', source_type: 'Image' },
  { event_id: 'EVT-004', date: '2026-09-01 13:45', factory_id: 'FAC-001', line_id: 'LINE-01', machine_id: 'MC-021', defect_class: 'Hole', model_id: 'YOLOv8n', confidence: 94, review_status: 'Pending', severity: 'HIGH', source_type: 'Recorded Video' },
  { event_id: 'EVT-005', date: '2026-09-01 15:20', factory_id: 'FAC-001', line_id: 'LINE-02', machine_id: 'MC-009', defect_class: 'Yarn Fault', model_id: 'SSD-family Detector', confidence: 82, review_status: 'Reviewed', severity: 'LOW', source_type: 'Image' },
  { event_id: 'EVT-006', date: '2026-08-31 08:30', factory_id: 'FAC-001', line_id: 'LINE-03', machine_id: 'MC-014', defect_class: 'Stain', model_id: 'YOLOv8n', confidence: 89, review_status: 'Reviewed', severity: 'MEDIUM', source_type: 'Recorded Video' },
  { event_id: 'EVT-007', date: '2026-08-31 11:05', factory_id: 'FAC-001', line_id: 'LINE-01', machine_id: 'MC-021', defect_class: 'Hole', model_id: 'YOLOv8n', confidence: 92, review_status: 'Pending', severity: 'HIGH', source_type: 'Image' },
  { event_id: 'EVT-008', date: '2026-08-30 14:15', factory_id: 'FAC-001', line_id: 'LINE-03', machine_id: 'MC-014', defect_class: 'Stain', model_id: 'YOLOv5n', confidence: 85, review_status: 'Reviewed', severity: 'LOW', source_type: 'Recorded Video' },
  { event_id: 'EVT-009', date: '2026-08-29 09:50', factory_id: 'FAC-001', line_id: 'LINE-02', machine_id: 'MC-009', defect_class: 'Cut', model_id: 'YOLOv8n', confidence: 90, review_status: 'Reviewed', severity: 'HIGH', source_type: 'Image' },
  { event_id: 'EVT-010', date: '2026-08-28 16:40', factory_id: 'FAC-001', line_id: 'LINE-03', machine_id: 'MC-014', defect_class: 'Contamination', model_id: 'YOLOv8n', confidence: 87, review_status: 'Pending', severity: 'MEDIUM', source_type: 'Recorded Video' },
  { event_id: 'EVT-011', date: '2026-08-27 10:15', factory_id: 'FAC-001', line_id: 'LINE-01', machine_id: 'MC-021', defect_class: 'Stain', model_id: 'YOLOv8n', confidence: 93, review_status: 'Reviewed', severity: 'LOW', source_type: 'Image' },
  { event_id: 'EVT-012', date: '2026-08-26 13:00', factory_id: 'FAC-001', line_id: 'LINE-03', machine_id: 'MC-014', defect_class: 'Yarn Fault', model_id: 'SSD-family Detector', confidence: 84, review_status: 'Reviewed', severity: 'LOW', source_type: 'Recorded Video' },
  { event_id: 'EVT-013', date: '2026-08-25 11:20', factory_id: 'FAC-001', line_id: 'LINE-02', machine_id: 'MC-009', defect_class: 'Stain', model_id: 'YOLOv8n', confidence: 88, review_status: 'Reviewed', severity: 'MEDIUM', source_type: 'Image' },
  { event_id: 'EVT-014', date: '2026-08-24 15:45', factory_id: 'FAC-001', line_id: 'LINE-03', machine_id: 'MC-014', defect_class: 'Hole', model_id: 'YOLOv8n', confidence: 95, review_status: 'Reviewed', severity: 'HIGH', source_type: 'Recorded Video' },
  { event_id: 'EVT-015', date: '2026-08-23 09:30', factory_id: 'FAC-001', line_id: 'LINE-01', machine_id: 'MC-021', defect_class: 'Contamination', model_id: 'YOLOv5n', confidence: 83, review_status: 'Reviewed', severity: 'LOW', source_type: 'Image' },
  { event_id: 'EVT-016', date: '2026-08-22 14:10', factory_id: 'FAC-001', line_id: 'LINE-03', machine_id: 'MC-014', defect_class: 'Stain', model_id: 'YOLOv8n', confidence: 91, review_status: 'Reviewed', severity: 'MEDIUM', source_type: 'Recorded Video' },
  { event_id: 'EVT-017', date: '2026-08-21 10:05', factory_id: 'FAC-001', line_id: 'LINE-02', machine_id: 'MC-009', defect_class: 'Cut', model_id: 'YOLOv8n', confidence: 89, review_status: 'Reviewed', severity: 'HIGH', source_type: 'Image' },
  { event_id: 'EVT-018', date: '2026-08-20 16:30', factory_id: 'FAC-001', line_id: 'LINE-03', machine_id: 'MC-014', defect_class: 'Stain', model_id: 'YOLOv8n', confidence: 92, review_status: 'Reviewed', severity: 'LOW', source_type: 'Recorded Video' }
];

const DEFAULT_FILTERS = {
  dateFrom: '2026-08-02',
  dateTo: '2026-09-01',
  factory: '',
  line: '',
  machine: '',
  defectClass: '',
  model: '',
  sourceType: '',
  reviewStatus: ''
};

export default function C1QualityWorkspace() {
  const navigate = useNavigate();

  // Filter Form State
  const [filterInputs, setFilterInputs] = useState(DEFAULT_FILTERS);
  // Applied Filter State
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  // Collapsible Limitation Card State
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filterInputs });
  };

  const handleResetFilters = () => {
    setFilterInputs(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  // Filter defect events based on applied filters
  const filteredEvents = useMemo(() => {
    return INITIAL_DEFECT_EVENTS.filter(evt => {
      if (appliedFilters.factory && evt.factory_id !== appliedFilters.factory) return false;
      if (appliedFilters.line && evt.line_id !== appliedFilters.line) return false;
      if (appliedFilters.machine && evt.machine_id !== appliedFilters.machine) return false;
      if (appliedFilters.defectClass && evt.defect_class !== appliedFilters.defectClass) return false;
      if (appliedFilters.model && evt.model_id !== appliedFilters.model) return false;
      if (appliedFilters.sourceType && evt.source_type !== appliedFilters.sourceType) return false;
      if (appliedFilters.reviewStatus && evt.review_status !== appliedFilters.reviewStatus) return false;
      
      if (appliedFilters.dateFrom) {
        const evtDate = evt.date.split(' ')[0];
        if (evtDate < appliedFilters.dateFrom) return false;
      }
      if (appliedFilters.dateTo) {
        const evtDate = evt.date.split(' ')[0];
        if (evtDate > appliedFilters.dateTo) return false;
      }
      
      return true;
    });
  }, [appliedFilters]);

  // Dynamic KPI Calculations with prototype consistent defaults
  const totalInspections = appliedFilters.line || appliedFilters.machine || appliedFilters.defectClass ? Math.min(12, Math.max(1, Math.ceil(filteredEvents.length * 0.67))) : 12;
  const totalDefectEvents = filteredEvents.length;
  const criticalDefectEvents = filteredEvents.filter(e => e.severity === 'HIGH').length;
  const pendingReviews = filteredEvents.filter(e => e.review_status === 'Pending').length;

  const mostFrequentDefect = useMemo(() => {
    if (filteredEvents.length === 0) return 'None';
    const counts = {};
    filteredEvents.forEach(e => {
      counts[e.defect_class] = (counts[e.defect_class] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'None');
  }, [filteredEvents]);

  const mostAffectedLine = useMemo(() => {
    if (filteredEvents.length === 0) return 'None';
    const counts = {};
    filteredEvents.forEach(e => {
      counts[e.line_id] = (counts[e.line_id] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'None');
  }, [filteredEvents]);

  // Chart 1: Defects by Type
  const defectsByTypeData = useMemo(() => {
    const categories = ['Stain', 'Hole', 'Cut', 'Yarn Fault', 'Contamination'];
    const counts = { Stain: 0, Hole: 0, Cut: 0, 'Yarn Fault': 0, Contamination: 0 };
    filteredEvents.forEach(e => {
      if (counts[e.defect_class] !== undefined) {
        counts[e.defect_class] += 1;
      }
    });
    return categories.map(cat => ({ name: cat, events: counts[cat] }));
  }, [filteredEvents]);

  // Chart 2: Defect Events Over Time
  const eventsOverTimeData = useMemo(() => {
    const map = {};
    filteredEvents.forEach(e => {
      const day = e.date.split(' ')[0].substring(5); // MM-DD
      map[day] = (map[day] || 0) + 1;
    });
    return Object.keys(map).sort().map(day => ({ date: day, events: map[day] }));
  }, [filteredEvents]);

  // Chart 3: Defects by Production Line
  const defectsByLineData = useMemo(() => {
    const lines = ['LINE-01', 'LINE-02', 'LINE-03'];
    const counts = { 'LINE-01': 0, 'LINE-02': 0, 'LINE-03': 0 };
    filteredEvents.forEach(e => {
      if (counts[e.line_id] !== undefined) {
        counts[e.line_id] += 1;
      }
    });
    return lines.map(line => ({ line: line, events: counts[line] }));
  }, [filteredEvents]);

  // Chart 4: Defects by Machine (Optional)
  const defectsByMachineData = useMemo(() => {
    const machines = ['MC-009', 'MC-014', 'MC-021'];
    const counts = { 'MC-009': 0, 'MC-014': 0, 'MC-021': 0 };
    filteredEvents.forEach(e => {
      if (counts[e.machine_id] !== undefined) {
        counts[e.machine_id] += 1;
      }
    });
    return machines.map(mc => ({ machine: mc, events: counts[mc] }));
  }, [filteredEvents]);

  const ProvenanceBadge = () => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      <p className="italic">Displayed research metrics are illustrative until replaced by validated experimental results.</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageHeader 
            title="Fabric Quality Overview" 
            description="Overall fabric-quality performance, trends and recent defect events." 
          />
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 w-fit">
            <UserCheck className="w-3.5 h-3.5" /> Primary Users: QC Manager, Production Manager, Quality Inspector
          </div>
        </div>
        <ProvenanceBadge />
      </div>

      {/* Default Model Information Banner */}
      <div className="bg-slate-900 text-white px-4 py-3 rounded-xl flex flex-wrap justify-between items-center text-sm shadow-sm gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-blue-400">
            <CheckCircle2 className="w-4 h-4 text-blue-400" /> Default Inspection Model: YOLOv8n
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300 text-xs flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Last Updated: 2026-09-01 09:30
          </span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300 text-xs hidden sm:inline">
            Set By: QC Manager
          </span>
        </div>
        <div className="text-xs text-slate-400 italic">
          (QC-approved default model pre-selected for new inspections)
        </div>
      </div>

      {/* Primary Navigation Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button 
          onClick={() => navigate('/c1/analytics')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
        >
          <BarChart2 className="w-4 h-4" /> Analytical Dashboard
        </button>
        <button 
          onClick={() => navigate('/c1/inspect-image')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition shadow-sm"
        >
          <ImageIcon className="w-4 h-4 text-blue-500" /> Inspect Image
        </button>
        <button 
          onClick={() => navigate('/c1/inspect-video')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition shadow-sm"
        >
          <Video className="w-4 h-4 text-purple-500" /> Inspect Recorded Video
        </button>
        <button 
          onClick={() => navigate('/c1/history')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition shadow-sm"
        >
          <History className="w-4 h-4 text-emerald-600" /> View History
        </button>
      </div>

      {/* Comprehensive Filter Panel */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" /> Overview Filters
          </span>
          <span className="text-xs text-gray-500">
            Current Scope: {appliedFilters.dateFrom || '2026-08-02'} to {appliedFilters.dateTo || '2026-09-01'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Date From</label>
            <input 
              type="date"
              value={filterInputs.dateFrom}
              onChange={e => setFilterInputs({ ...filterInputs, dateFrom: e.target.value })}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Date To</label>
            <input 
              type="date"
              value={filterInputs.dateTo}
              onChange={e => setFilterInputs({ ...filterInputs, dateTo: e.target.value })}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Factory</label>
            <select 
              value={filterInputs.factory} 
              onChange={e => setFilterInputs({ ...filterInputs, factory: e.target.value })}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Factories</option>
              <option value="FAC-001">FAC-001</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Production Line</label>
            <select 
              value={filterInputs.line} 
              onChange={e => setFilterInputs({ ...filterInputs, line: e.target.value })}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Lines</option>
              <option value="LINE-01">LINE-01</option>
              <option value="LINE-02">LINE-02</option>
              <option value="LINE-03">LINE-03</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Machine</label>
            <select 
              value={filterInputs.machine} 
              onChange={e => setFilterInputs({ ...filterInputs, machine: e.target.value })}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Machines</option>
              <option value="MC-009">MC-009</option>
              <option value="MC-014">MC-014</option>
              <option value="MC-021">MC-021</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Defect Class</label>
            <select 
              value={filterInputs.defectClass} 
              onChange={e => setFilterInputs({ ...filterInputs, defectClass: e.target.value })}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Defects</option>
              <option value="Stain">Stain</option>
              <option value="Hole">Hole</option>
              <option value="Cut">Cut</option>
              <option value="Yarn Fault">Yarn Fault</option>
              <option value="Contamination">Contamination</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Model</label>
            <select 
              value={filterInputs.model} 
              onChange={e => setFilterInputs({ ...filterInputs, model: e.target.value })}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Models</option>
              <option value="YOLOv8n">YOLOv8n</option>
              <option value="YOLOv5n">YOLOv5n</option>
              <option value="SSD-family Detector">SSD-family Detector</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Source Type</label>
            <select 
              value={filterInputs.sourceType} 
              onChange={e => setFilterInputs({ ...filterInputs, sourceType: e.target.value })}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="Image">Image</option>
              <option value="Recorded Video">Recorded Video</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Review Status</label>
            <select 
              value={filterInputs.reviewStatus} 
              onChange={e => setFilterInputs({ ...filterInputs, reviewStatus: e.target.value })}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Review Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Reviewed">Reviewed</option>
            </select>
          </div>

          <div className="flex items-end gap-2 col-span-1 sm:col-span-2 md:col-span-1">
            <button 
              onClick={handleApplyFilters}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition"
            >
              Apply Filters
            </button>
            <button 
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Section - 9 Required Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3">
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium leading-tight">Total Inspections</p>
          <p className="text-xl font-bold mt-1 text-gray-900">{totalInspections}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium leading-tight">Total Defect Events</p>
          <p className="text-xl font-bold mt-1 text-orange-600">{totalDefectEvents}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium leading-tight">Critical Defect Events</p>
          <p className="text-xl font-bold mt-1 text-red-600">{criticalDefectEvents}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium leading-tight">Pending Reviews</p>
          <p className="text-xl font-bold mt-1 text-amber-600">{pendingReviews}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium leading-tight">Most Frequent Defect</p>
          <p className="text-base font-bold mt-1 text-gray-900 truncate">{mostFrequentDefect}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium leading-tight">Most Affected Line</p>
          <p className="text-base font-bold mt-1 text-gray-900 truncate">{mostAffectedLine}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium leading-tight">Avg Processing FPS</p>
          <p className="text-base font-bold mt-1 text-emerald-600">31.4 FPS</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium leading-tight">Median Latency</p>
          <p className="text-base font-bold mt-1 text-indigo-600">28 ms</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium leading-tight">Default Model</p>
          <p className="text-base font-bold mt-1 text-blue-600 truncate">YOLOv8n</p>
        </div>
      </div>

      {/* Required Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Defects by Type */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" /> Defects by Type
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defectsByTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                />
                <Bar dataKey="events" name="Defect Events" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Defect Events Over Time */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" /> Defect Events Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eventsOverTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                />
                <Line type="monotone" dataKey="events" name="Defect Events" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Defects by Production Line */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-600" /> Defects by Production Line
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defectsByLineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="line" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                />
                <Bar dataKey="events" name="Defect Events" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Optional Chart 4: Defects by Machine */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-600" /> Defects by Machine
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defectsByMachineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="machine" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                />
                <Bar dataKey="events" name="Defect Events" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Defect Events Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden space-y-0">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Recent Defect Events</h3>
            <p className="text-xs text-gray-500">Unique physical defect events recorded across factory lines</p>
          </div>
          <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2.5 py-1 rounded">
            Showing {filteredEvents.length} events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b text-xs uppercase tracking-wider font-semibold">
                <th className="p-3">Event ID</th>
                <th className="p-3">Date / Time</th>
                <th className="p-3">Factory</th>
                <th className="p-3">Line</th>
                <th className="p-3">Machine</th>
                <th className="p-3">Defect</th>
                <th className="p-3">Model</th>
                <th className="p-3">Confidence</th>
                <th className="p-3">Review Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {filteredEvents.map(evt => (
                <tr key={evt.event_id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-blue-600">{evt.event_id}</td>
                  <td className="p-3 text-gray-600 whitespace-nowrap">{evt.date}</td>
                  <td className="p-3 text-gray-700">{evt.factory_id}</td>
                  <td className="p-3 text-gray-700 font-medium">{evt.line_id}</td>
                  <td className="p-3 text-gray-700">{evt.machine_id}</td>
                  <td className="p-3 font-semibold text-gray-900">{evt.defect_class}</td>
                  <td className="p-3 text-gray-600">{evt.model_id}</td>
                  <td className="p-3 text-gray-700">{evt.confidence}%</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      evt.review_status === 'Pending' 
                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                        : 'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      {evt.review_status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => navigate(`/c1/event/${evt.event_id}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 rounded font-medium text-gray-700 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" /> View Details
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-gray-500">
                    No defect events found matching the active filter context.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prototype Limitation Notice */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 text-slate-300 overflow-hidden text-xs">
        <button 
          onClick={() => setIsNoticeOpen(!isNoticeOpen)}
          className="w-full p-4 text-left font-bold text-white flex items-center justify-between hover:bg-slate-750 transition"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" /> Prototype / Illustrative Data Notice
          </span>
          <span className="text-slate-400 font-normal text-[11px]">
            {isNoticeOpen ? 'Hide Notice ▲' : 'Show Notice ▼'}
          </span>
        </button>

        {isNoticeOpen && (
          <div className="px-6 pb-5 space-y-2 border-t border-slate-700/60 pt-3">
            <ul className="list-disc pl-5 space-y-1 text-slate-300 text-xs">
              <li>Dashboard values may use precomputed demonstration records.</li>
              <li>No live fabric-inspection model is executed in the browser at this proposal stage.</li>
              <li>Displayed model/XAI outputs must not be interpreted as proof of physical causality.</li>
              <li>Human quality-team review is required.</li>
              <li>Final research implementation will replace demonstration values with validated experimental outputs.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
