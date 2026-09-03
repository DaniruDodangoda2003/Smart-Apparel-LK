import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import { loadLocal, saveLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { Search, AlertTriangle, UserCheck, Download, Plus, X } from 'lucide-react';

export default function C4OperatorProfiles() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [operators, setOperators] = useState([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterMachine, setFilterMachine] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('');
  const [filterLine, setFilterLine] = useState('');

  // Candidate Pool
  const [candidatePool, setCandidatePool] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ops, skillProfs] = await loadMultipleDemoJson([
          'shared/operators.json',
          'c4/skill_profiles.json'
        ]);
        
        const merged = (ops || []).map(op => {
          const prof = (skillProfs || []).find(p => p.operator_id === op.operator_id);
          return {
            ...op,
            ...prof // Merge synthetic data if available
          };
        });
        setOperators(merged);
        
        const savedPool = loadLocal('smartapparel.c4.candidatePool', []);
        setCandidatePool(savedPool);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading Operator Profiles..." />;
  if (error) return <ErrorState title="Failed to load operator data" message={error} />;

  const filteredOperators = operators.filter(op => {
    const matchesSearch = op.operator_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (op.display_name && op.display_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGrade = filterGrade ? op.grade === filterGrade : true;
    const matchesMachine = filterMachine ? (op.primary_machine === filterMachine || op.secondary_machine === filterMachine) : true;
    const matchesAvailability = filterAvailability ? op.availability === filterAvailability : true;
    const matchesLine = filterLine ? op.current_line === filterLine : true;
    return matchesSearch && matchesGrade && matchesMachine && matchesAvailability && matchesLine;
  });

  const handleExportCSV = () => {
    const headers = ['Operator ID', 'Legacy ID', 'Name', 'Grade', 'Primary Machine', 'Secondary Machine', 'Historical Efficiency', 'Attendance Rate', 'Availability'];
    const rows = filteredOperators.map(op => [
      op.operator_id,
      op.legacy_id || 'N/A',
      op.display_name || 'Unknown',
      op.grade || 'N/A',
      op.primary_machine || 'N/A',
      op.secondary_machine || 'N/A',
      op.historical_efficiency ? `${(op.historical_efficiency * 100).toFixed(1)}%` : 'N/A',
      op.attendance_rate ? `${(op.attendance_rate * 100).toFixed(1)}%` : 'N/A',
      op.availability || 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Skill_Matrix_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleCandidatePool = (opId) => {
    const newPool = candidatePool.includes(opId) 
      ? candidatePool.filter(id => id !== opId) 
      : [...candidatePool, opId];
    setCandidatePool(newPool);
    saveLocal('smartapparel.c4.candidatePool', newPool);
  };

  const ProvenanceBadge = () => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold">
        Data Classification: SYNTHETIC_DEMONSTRATION
      </span>
      <p className="italic">Not a live production recommendation</p>
    </div>
  );

  // KPIs
  const totalAvailable = operators.filter(o => o.availability === 'AVAILABLE').length;
  const multiSkilled = operators.filter(o => o.primary_machine && o.secondary_machine).length;
  const multiSkilledRatio = operators.length > 0 ? (multiSkilled / operators.length) : 0;
  const absentOps = operators.filter(o => o.availability === 'ABSENT').length;
  const opsWithEff = operators.filter(o => o.historical_efficiency !== undefined);
  const avgHistEff = opsWithEff.length > 0 ? opsWithEff.reduce((acc, o) => acc + o.historical_efficiency, 0) / opsWithEff.length : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <PageHeader title="Operator & Skill Profiles" description="Review operator skill profiles and competency evidence." />
        <ProvenanceBadge />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Available Operators</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{totalAvailable}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Multi-Skilled Ratio</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{(multiSkilledRatio * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Absent Operators</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">{absentOps}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Avg Hist. Efficiency</p>
          <p className="text-2xl font-bold mt-1 text-indigo-600">{(avgHistEff * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap justify-between items-end gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end flex-1">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search Operator ID or Name..."
              className="pl-9 pr-4 py-1.5 w-full border border-gray-300 rounded-md text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
            <select className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[120px]" value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
              <option value="">All Grades</option>
              <option value="Grade A">Grade A</option>
              <option value="Grade B">Grade B</option>
              <option value="Grade C">Grade C</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Machine</label>
            <select className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[120px]" value={filterMachine} onChange={(e) => setFilterMachine(e.target.value)}>
              <option value="">All Machines</option>
              <option value="Single Needle">Single Needle</option>
              <option value="Overlock">Overlock</option>
              <option value="Flatlock">Flatlock</option>
              <option value="Multi-Needle">Multi-Needle</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Availability</label>
            <select className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[120px]" value={filterAvailability} onChange={(e) => setFilterAvailability(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ON_LINE">On Line</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>
        </div>
        
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 shadow-sm"
        >
          <Download className="w-4 h-4" /> Export Skill Matrix CSV
        </button>
      </div>

      {/* Operator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOperators.map(op => {
          const inPool = candidatePool.includes(op.operator_id);
          
          return (
            <div key={op.operator_id} className={`bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden transition-all ${inPool ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200'}`}>
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-lg">{op.display_name || 'Unknown'}</h4>
                        {op.grade && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            op.grade === 'Grade A' ? 'bg-green-100 text-green-700' :
                            op.grade === 'Grade B' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {op.grade}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className="font-medium text-gray-700">{op.operator_id}</span>
                        {op.legacy_id && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>{op.legacy_id}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                    op.availability === 'AVAILABLE' ? 'bg-green-50 text-green-700 border-green-200' : 
                    op.availability === 'ON_LINE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {op.availability || 'UNKNOWN'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <span className="text-gray-500 text-xs">Primary</span>
                    <span className="font-semibold text-xs">{op.primary_machine || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <span className="text-gray-500 text-xs">Secondary</span>
                    <span className="font-semibold text-xs">{op.secondary_machine || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <span className="text-gray-500 text-xs">Hist. Efficiency</span>
                    <span className="font-semibold text-xs">{op.historical_efficiency ? `${(op.historical_efficiency * 100).toFixed(1)}%` : '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <span className="text-gray-500 text-xs">Attendance</span>
                    <span className="font-semibold text-xs">{op.attendance_rate ? `${(op.attendance_rate * 100).toFixed(1)}%` : '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <span className="text-gray-500 text-xs">Overtime (7d)</span>
                    <span className="font-semibold text-xs">{op.overtime_past_7_days !== undefined ? `${op.overtime_past_7_days}h` : '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <span className="text-gray-500 text-xs">Current Line</span>
                    <span className="font-semibold text-xs text-blue-600">{op.current_line || '-'}</span>
                  </div>
                </div>

                {op.competency_evidence && (
                  <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Competency Evidence</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-gray-500 mb-0.5">Speed</p>
                        <p className="font-semibold text-gray-800">{op.competency_evidence.speed}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-0.5">Quality</p>
                        <p className="font-semibold text-gray-800">{op.competency_evidence.quality}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-0.5">Versatility</p>
                        <p className="font-semibold text-gray-800">{op.competency_evidence.versatility}</p>
                      </div>
                    </div>
                  </div>
                )}

                {op.synthetic_skill_tags && (
                  <div className="mb-2">
                    <div className="flex flex-wrap gap-1">
                      {op.synthetic_skill_tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] border border-indigo-100 font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 bg-gray-50 p-3 flex gap-2">
                <button 
                  className="flex-1 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-100"
                  onClick={() => alert(`Viewing profile for ${op.display_name}. (Prototype)`)}
                >
                  View Profile
                </button>
                <button 
                  onClick={() => toggleCandidatePool(op.operator_id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${
                    inPool 
                      ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {inPool ? <><X className="w-3 h-3" /> Remove from Pool</> : <><Plus className="w-3 h-3" /> Add to Candidate Pool</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredOperators.length === 0 && (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 flex flex-col items-center">
          <Search className="w-8 h-8 text-gray-300 mb-3" />
          <p className="font-medium text-gray-600 text-lg">No operators found matching the criteria.</p>
          <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
        </div>
      )}

      {/* Prototype Limitations Notice */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300 space-y-3 mt-6">
        <h4 className="font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" /> Prototype Limitations</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Workforce forecasts are fixed precomputed demonstration outputs.</li>
          <li>Model attributions do not prove operational or employee-level causation.</li>
          <li>Extended operator skill profiles are synthetic demonstration data.</li>
          <li>Allocation candidates are precomputed demonstration candidates.</li>
          <li>Simulated gains are not guaranteed productivity results.</li>
          <li>No live HR, attendance, production or skill-matrix system is connected.</li>
          <li>Human approval and factory validation are required.</li>
          <li>Exported CSV contains synthetic demonstration workforce data only.</li>
        </ul>
      </div>
    </div>
  );
}
