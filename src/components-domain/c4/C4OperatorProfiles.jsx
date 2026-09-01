import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadMultipleDemoJson } from '../../shared/data/loaders';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { Search, AlertTriangle, UserCheck } from 'lucide-react';

export default function C4OperatorProfiles() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [operators, setOperators] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSkill, setFilterSkill] = useState('');

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
    const matchesSearch = op.operator_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkill = filterSkill ? op.skill_level === filterSkill : true;
    return matchesSearch && matchesSkill;
  });

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <PageHeader title="Operator & Skill Profiles" description="Review operator skill profiles." />
        <ProvenanceBadge />
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search Operator ID..."
            className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">Filter Skill Level:</label>
          <select 
            className="border border-gray-300 rounded px-3 py-2 text-sm"
            value={filterSkill}
            onChange={(e) => setFilterSkill(e.target.value)}
          >
            <option value="">All</option>
            <option value="EXPERT">EXPERT</option>
            <option value="INTERMEDIATE">INTERMEDIATE</option>
            <option value="BEGINNER">BEGINNER</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOperators.map(op => (
          <div key={op.operator_id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{op.operator_id}</h4>
                  <p className="text-xs text-gray-500">Factory: {op.factory_id}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                op.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {op.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between border-b border-gray-100 py-1">
                <span className="text-gray-500">Official Skill Level</span>
                <span className="font-semibold">{op.skill_level}</span>
              </div>
            </div>

            {op.synthetic_skill_tags ? (
              <div className="mt-auto pt-4 border-t border-gray-100 space-y-3">
                <p className="text-xs text-purple-600 font-semibold mb-2">Synthetic operator skill-profile demonstration data.</p>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Synthetic Skill Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {op.synthetic_skill_tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs border border-indigo-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {op.synthetic_preference && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Synthetic Preferences</p>
                    <p className="text-sm font-medium text-gray-800">{op.synthetic_preference}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-auto pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 italic">No supplementary skill-profile data is available for this operator.</p>
              </div>
            )}
          </div>
        ))}
      </div>
      {filteredOperators.length === 0 && (
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          No operators found matching the criteria.
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
        </ul>
      </div>
    </div>
  );
}
