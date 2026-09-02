import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import { loadLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { ArrowLeft, Clock, Filter, Download, FileText, Eye, Printer, X } from 'lucide-react';

export default function C1History() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [history, setHistory] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [explanations, setExplanations] = useState([]);
  const [detections, setDetections] = useState([]);
  const [c1State] = useState(() => loadLocal('smartapparel.c1.state', { defaultModel: 'model_yolov8n', reviews: {} }));

  const [filters, setFilters] = useState({ date: '', status: '', defect: '' });
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hist, insps, evals, exps, dets] = await Promise.all([
          loadDemoJson('c1/history.json').catch(() => []),
          loadDemoJson('c1/inspections.json').catch(() => []),
          loadDemoJson('c1/model_evaluations.json').catch(() => []),
          loadDemoJson('c1/explanations.json').catch(() => []),
          loadDemoJson('c1/detections.json').catch(() => [])
        ]);
        setHistory(hist);
        setInspections(insps);
        setEvaluations(evals);
        setExplanations(exps);
        setDetections(dets);
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

  const filteredHistory = history.filter(h => {
    const matchDate = filters.date ? new Date(h.date).toLocaleDateString() === new Date(filters.date).toLocaleDateString() : true;
    const matchStatus = filters.status ? h.status === filters.status : true;
    const matchDefect = filters.defect ? h.defect_class === filters.defect : true;
    return matchDate && matchStatus && matchDefect;
  });

  const exportCSV = () => {
    if (filteredHistory.length === 0) return;
    const headers = ["Date", "Inspection ID", "Roll ID", "Factory", "Line", "Machine", "Status", "Events", "Defect Class"];
    const rows = filteredHistory.map(h => [
      new Date(h.date).toISOString(), h.inspection_id, h.roll_id, h.factory_id, h.line_id, h.machine_id, h.status, h.events, h.defect_class
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `C1_History_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewReport = (histItem) => {
    const insp = inspections.find(i => i.inspection_id === histItem.inspection_id);
    const exp = explanations.find(e => e.inspection_id === histItem.inspection_id);
    const det = detections.find(d => d.inspection_id === histItem.inspection_id);
    const review = c1State.reviews[histItem.inspection_id] || {};
    
    setReportData({
      ...histItem,
      fullInspection: insp,
      explanation: exp,
      detection: det,
      review: review
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/c1')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <PageHeader title="Fabric Quality History" description="Historical records and print-ready reports." />
        </div>
        <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 text-[10px] rounded border border-gray-200">
          <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        
        {/* Filters and Actions */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex flex-wrap gap-3 items-center text-sm">
            <span className="font-bold text-gray-500 flex items-center gap-1"><Filter className="w-4 h-4"/> Filters:</span>
            <input type="date" value={filters.date} onChange={e=>setFilters({...filters, date: e.target.value})} className="border border-gray-300 rounded p-1" />
            <select value={filters.status} onChange={e=>setFilters({...filters, status: e.target.value})} className="border border-gray-300 rounded p-1">
              <option value="">All Statuses</option>
              <option value="DEFECTIVE">Defective</option>
              <option value="PASSED">Passed</option>
            </select>
            <select value={filters.defect} onChange={e=>setFilters({...filters, defect: e.target.value})} className="border border-gray-300 rounded p-1">
              <option value="">All Defects</option>
              <option value="Oil Stain">Oil Stain</option>
              <option value="None">None</option>
            </select>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Table */}
        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  <th className="p-3 font-medium">Date/Time</th>
                  <th className="p-3 font-medium">Inspection ID</th>
                  <th className="p-3 font-medium">Context</th>
                  <th className="p-3 font-medium">Status / Defect</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-xs text-gray-700">
                      {new Date(h.date).toLocaleDateString()}<br/>
                      <span className="text-gray-400">{new Date(h.date).toLocaleTimeString()}</span>
                    </td>
                    <td className="p-3 font-bold text-blue-600">{h.inspection_id}<br/><span className="text-gray-500 font-normal text-xs">{h.roll_id}</span></td>
                    <td className="p-3 text-xs">
                      {h.factory_id} / {h.line_id}<br/>
                      {h.machine_id}
                    </td>
                    <td className="p-3">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.status === 'DEFECTIVE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {h.status}
                       </span>
                       <br/><span className="text-xs font-semibold">{h.defect_class}</span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => navigate(`/c1/event/${h.inspection_id}`)} className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          <Eye className="w-3 h-3" /> Details
                        </button>
                        <button onClick={() => handleViewReport(h)} className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          <FileText className="w-3 h-3" /> Report
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic p-8 text-center bg-gray-50 rounded border">No history records match the current filters.</p>
        )}
      </div>

      {/* Print-Ready Report Modal */}
      {reportData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl my-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Inspection Report</h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border rounded font-medium text-sm flex items-center gap-1">
                  <Printer className="w-4 h-4" /> Print Report
                </button>
                <button onClick={() => setReportData(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Printable Content Area */}
            <div className="p-8 space-y-6 print:p-0">
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-black text-gray-900">QUALITY INSPECTION REPORT</h1>
                <p className="text-gray-500">{reportData.inspection_id} | {new Date(reportData.date).toLocaleString()}</p>
                <p className="text-xs text-red-600 font-bold mt-1">Generated via DEMO_PRECOMPUTED System</p>
              </div>

              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <h3 className="font-bold border-b mb-2 text-gray-800">Context Information</h3>
                  <table className="w-full">
                    <tbody>
                      <tr><td className="py-1 text-gray-600">Factory</td><td className="py-1 font-semibold">{reportData.factory_id}</td></tr>
                      <tr><td className="py-1 text-gray-600">Line</td><td className="py-1 font-semibold">{reportData.line_id}</td></tr>
                      <tr><td className="py-1 text-gray-600">Machine</td><td className="py-1 font-semibold">{reportData.machine_id}</td></tr>
                      <tr><td className="py-1 text-gray-600">Roll ID</td><td className="py-1 font-semibold">{reportData.roll_id}</td></tr>
                      <tr><td className="py-1 text-gray-600">Source Type</td><td className="py-1 font-semibold">{reportData.source_type}</td></tr>
                      <tr><td className="py-1 text-gray-600">Operator</td><td className="py-1 font-semibold">{reportData.fullInspection?.operator_id || 'N/A'}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="font-bold border-b mb-2 text-gray-800">Inspection Results</h3>
                  <table className="w-full">
                    <tbody>
                      <tr><td className="py-1 text-gray-600">Quality Status</td><td className="py-1 font-semibold">{reportData.status}</td></tr>
                      <tr><td className="py-1 text-gray-600">Defect Class</td><td className="py-1 font-semibold text-red-600">{reportData.defect_class}</td></tr>
                      <tr><td className="py-1 text-gray-600">Confidence</td><td className="py-1 font-semibold">{reportData.detection ? (reportData.detection.confidence * 100).toFixed(1) + '%' : 'N/A'}</td></tr>
                      <tr><td className="py-1 text-gray-600">Model Used</td><td className="py-1 font-semibold">{reportData.detection?.model || evaluations.find(m=>m.id===c1State.defaultModel)?.name}</td></tr>
                      <tr><td className="py-1 text-gray-600">Affected Area</td><td className="py-1 font-semibold">{reportData.fullInspection?.affected_area || 'N/A'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-bold border-b mb-2 text-gray-800">Machine Intelligence Evidence</h3>
                <div className="bg-gray-50 p-4 rounded border text-sm">
                  <p><span className="font-semibold text-gray-700">XAI Reference:</span> {reportData.detection?.xai_evidence || 'No XAI data'}</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold border-b mb-2 text-gray-800">Ranked Probable Causes</h3>
                {reportData.explanation?.probable_causes?.length > 0 ? (
                  <ul className="space-y-3 text-sm">
                    {reportData.explanation.probable_causes.map(pc => (
                      <li key={pc.rank} className="p-3 border rounded">
                        <p className="font-bold">#{pc.rank}: {pc.cause}</p>
                        <p className="text-xs text-gray-600 mt-1"><span className="font-semibold">Supporting:</span> {pc.supporting_evidence}</p>
                        <p className="text-xs text-gray-600"><span className="font-semibold">Missing:</span> {pc.missing_evidence}</p>
                        <p className="text-xs mt-1 font-semibold">Human Review: <span className={reportData.review.causes?.[pc.rank] === 'Relevant' ? 'text-green-600' : 'text-gray-500'}>{reportData.review.causes?.[pc.rank] || 'PENDING'}</span></p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm italic text-gray-500">No probable causes recorded.</p>
                )}
              </div>

              <div>
                <h3 className="font-bold border-b mb-2 text-gray-800">Human Review & Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded border border-blue-100">
                    <p className="font-semibold text-blue-900 mb-1">Review Notes</p>
                    <p className="text-blue-800">{reportData.review.notes || <span className="italic opacity-50">No notes provided</span>}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded border border-green-100">
                    <p className="font-semibold text-green-900 mb-1">Corrective Action Taken</p>
                    <p className="text-green-800">{reportData.review.correctiveAction || <span className="italic opacity-50">No action recorded</span>}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-xs text-gray-400 mt-8 pt-4 border-t">
                End of Report. Smart-Apparel-LK.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
