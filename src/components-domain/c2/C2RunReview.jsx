import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadDemoJson } from '../../shared/data/loaders';
import { loadLocal, saveLocal } from '../../shared/storage/localStore';
import PageHeader from '../../shared/components/PageHeader';
import LoadingState from '../../shared/components/LoadingState';
import ErrorState from '../../shared/components/ErrorState';
import { useAppContext } from '../../shared/context/AppContext';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, ArrowLeft, ShieldCheck, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const STEPS = [
  'ERP / Material Intake',
  'CAD / Marker',
  'Pre-cut Parameters',
  'Leakage & Data Gate',
  'Waste Prediction',
  'Contributor Review',
  'Strategy Comparison',
  'Export / Validation'
];

export default function C2RunReview() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { savedActions, setSavedActions, userRole, outputMode } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [runData, setRunData] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [factories, setFactories] = useState([]);
  const [batches, setBatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [styles, setStyles] = useState([]);
  
  const [activeStep, setActiveStep] = useState(0);
  const [localState, setLocalState] = useState(() => loadLocal('smartapparel.c2.state', {}));

  useEffect(() => {
    const fetchRunData = async () => {
      try {
        const [runs, allContribs, allStrats, demoInputs, cadDemoInputs, facts, bats, ords, stys] = await Promise.all([
          loadDemoJson('c2/runs.json'),
          loadDemoJson('c2/contributors.json'),
          loadDemoJson('c2/strategies.json'),
          loadDemoJson('c2/demo_inputs.json'),
          loadDemoJson('c2/cad_demo.json'),
          loadDemoJson('shared/factories.json').catch(() => []),
          loadDemoJson('shared/batches.json').catch(() => []),
          loadDemoJson('shared/orders.json').catch(() => []),
          loadDemoJson('shared/styles.json').catch(() => [])
        ]);
        
        const run = runs.find(r => r.run_id === runId);
        if (!run) throw new Error('Run not found');
        
        setRunData(run);
        setContributors(allContribs.filter(c => c.run_id === runId));
        setStrategies(allStrats.filter(s => s.run_id === runId));
        if(facts) setFactories(facts);
        if(bats) setBatches(bats);
        if(ords) setOrders(ords);
        if(stys) setStyles(stys);
        
        setLocalState(prev => {
          const runState = prev[runId] || {};
          
          if (runState.schema_version !== 2 || !runState.demo_defaults_initialized) {
            // Helper to get valid value prioritizing user -> run -> demo
            const getValidValue = (userVal, runVal, demoVal) => {
              const isInvalid = (v) => v === null || v === undefined || v === '' || (typeof v === 'string' && v.trim() === '') || (typeof v === 'number' && isNaN(v));
              if (!isInvalid(userVal)) return userVal;
              if (!isInvalid(runVal)) return runVal;
              return demoVal;
            };

            const existingErp = runState.erp || {};
            const newErp = {
              factory_id: getValidValue(existingErp.factory_id, run.factory_id, 'FAC-001'),
              batch_id: getValidValue(existingErp.batch_id, run.batch_id, 'BAT-24081'),
              order_id: getValidValue(existingErp.order_id, run.order_id, 'ORD-24081'),
              style_id: getValidValue(existingErp.style_id, run.style_id, 'STY-00802'),
              draft_order_quantity: getValidValue(existingErp.draft_order_quantity, run.draft_order_quantity, demoInputs.erp.draft_order_quantity),
              fabric_composition: getValidValue(existingErp.fabric_composition, run.fabric_composition, demoInputs.erp.fabric_composition),
              gsm: getValidValue(existingErp.gsm, run.gsm, demoInputs.erp.gsm),
              supplier: getValidValue(existingErp.supplier, run.supplier, demoInputs.erp.supplier),
              lot: getValidValue(existingErp.lot, run.lot, demoInputs.erp.lot),
              size_ratio: getValidValue(existingErp.size_ratio, run.size_ratio, demoInputs.erp.size_ratio),
              fabric_price: getValidValue(existingErp.fabric_price, run.fabric_price, demoInputs.erp.fabric_price),
              planned_delivery_date: getValidValue(existingErp.planned_delivery_date, run.planned_delivery_date, demoInputs.erp.planned_delivery_date)
            };

            const existingPreCut = runState.preCut || {};
            const newPreCut = {
              number_of_plies: getValidValue(existingPreCut.number_of_plies, run.number_of_plies, demoInputs.pre_cut.number_of_plies),
              spread_length: getValidValue(existingPreCut.spread_length, run.spread_length, demoInputs.pre_cut.spread_length),
              splice_policy: getValidValue(existingPreCut.splice_policy, run.splice_policy, demoInputs.pre_cut.splice_policy),
              end_allowance: getValidValue(existingPreCut.end_allowance, run.end_allowance, demoInputs.pre_cut.end_allowance),
              defects_per_lay: getValidValue(existingPreCut.defects_per_lay, run.defects_per_lay, demoInputs.pre_cut.defects_per_lay),
              machine_width: getValidValue(existingPreCut.machine_width, run.machine_width, demoInputs.pre_cut.machine_width),
              cut_table_width: getValidValue(existingPreCut.cut_table_width, run.cut_table_width, demoInputs.pre_cut.cut_table_width),
              lay_height_limit: getValidValue(existingPreCut.lay_height_limit, run.lay_height_limit, demoInputs.pre_cut.lay_height_limit),
              shift: getValidValue(existingPreCut.shift, run.shift, demoInputs.pre_cut.shift),
              review_threshold: getValidValue(existingPreCut.review_threshold, run.review_threshold, demoInputs.pre_cut.review_threshold)
            };
            
            setErpDraft(newErp);
            setPreCutDraft(newPreCut);
            
            return {
              ...prev,
              [runId]: {
                ...runState,
                schema_version: 2,
                demo_defaults_initialized: true,
                erp: newErp,
                preCut: newPreCut
              }
            };
          } else {
             setErpDraft(runState.erp);
             setPreCutDraft(runState.preCut);
             if (runState.cad) {
               setCadDraft(runState.cad);
               setCadStatus(runState.cadStatus || 'PREVIEW_READY');
             }
          }
          return prev;
        });
        
        // Save demo inputs to a ref or state if needed for later, but we can just fetch it when needed or keep it in scope.
        // Actually we need cadDemoInputs later. Let's store it in state.
        setCadDemoFixture(cadDemoInputs);
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRunData();
  }, [runId]);

  // Sync to local storage
  useEffect(() => {
    if (runData) {
      saveLocal('smartapparel.c2.state', localState);
    }
  }, [localState, runData]);

  // Draft inputs
  const [erpDraft, setErpDraft] = useState({});
  const [preCutDraft, setPreCutDraft] = useState({});
  const [cadDraft, setCadDraft] = useState({});
  const [cadStatus, setCadStatus] = useState('NOT_LOADED');
  const [cadError, setCadError] = useState(null);
  const [cadDemoFixture, setCadDemoFixture] = useState(null);
  
  // Downstream invalidation helper
  const updateDraft = (type, values) => {
    if (type === 'erp') setErpDraft(values);
    if (type === 'preCut') setPreCutDraft(values);
    if (type === 'cad') setCadDraft(values);
    
    // Invalidate gate and subsequent steps
    const newLocal = { ...localState };
    if (!newLocal[runId]) newLocal[runId] = {};
    newLocal[runId][type] = values;
    if (type === 'cad') newLocal[runId].cadStatus = 'PREVIEW_READY'; // Revert to preview if edited
    newLocal[runId].gatePassed = false;
    
    setLocalState(newLocal);
  };

  const handleCadUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name === 'marker_demo.dxf') {
      setCadError(null);
      setCadStatus('DEMO_FIXTURE_LOADED');
      
      setTimeout(() => {
        setCadDraft(cadDemoFixture.cad);
        setCadStatus('PREVIEW_READY');
        
        const newLocal = { ...localState };
        if (!newLocal[runId]) newLocal[runId] = {};
        newLocal[runId].cad = cadDemoFixture.cad;
        newLocal[runId].cadStatus = 'PREVIEW_READY';
        setLocalState(newLocal);
      }, 500);
    } else {
      setCadError('Live CAD parsing is not available in this prototype. Please use the provided demo CAD file.');
    }
  };

  const handleUseFixedDemo = () => {
    setCadError(null);
    setCadStatus('DEMO_FIXTURE_LOADED');
    setTimeout(() => {
      setCadDraft(cadDemoFixture.cad);
      setCadStatus('PREVIEW_READY');
      
      const newLocal = { ...localState };
      if (!newLocal[runId]) newLocal[runId] = {};
      newLocal[runId].cad = cadDemoFixture.cad;
      newLocal[runId].cadStatus = 'PREVIEW_READY';
      setLocalState(newLocal);
    }, 500);
  };

  const acceptCad = () => {
    setCadStatus('ACCEPTED');
    const newLocal = { ...localState };
    if (!newLocal[runId]) newLocal[runId] = {};
    newLocal[runId].cadStatus = 'ACCEPTED';
    setLocalState(newLocal);
  };

  const handleGateValidation = () => {
    const missing = [];
    
    // Treat numeric zero as valid. Only null, undefined, empty string, whitespace string and NaN are missing.
    const isMissing = (val) => val === null || val === undefined || (typeof val === 'string' && val.trim() === '') || (typeof val === 'number' && isNaN(val));
    const isMissingNumeric = (val) => isMissing(val) || isNaN(parseFloat(val));

    // ERP Fields
    let erpFilled = 0;
    const erpTotal = 10;
    if (!isMissing(erpDraft.factory_id)) erpFilled++; else missing.push('Factory ID');
    if (!isMissing(erpDraft.batch_id)) erpFilled++; else missing.push('Batch ID');
    if (!isMissing(erpDraft.order_id)) erpFilled++; else missing.push('Order ID');
    if (!isMissing(erpDraft.style_id)) erpFilled++; else missing.push('Style ID');
    if (!isMissingNumeric(erpDraft.draft_order_quantity) && parseFloat(erpDraft.draft_order_quantity) > 0) erpFilled++; else missing.push('Draft Order Quantity');
    if (!isMissing(erpDraft.fabric_composition)) erpFilled++; else missing.push('Fabric Composition');
    if (!isMissingNumeric(erpDraft.gsm) && parseFloat(erpDraft.gsm) > 0) erpFilled++; else missing.push('GSM');
    if (!isMissing(erpDraft.supplier)) erpFilled++; else missing.push('Supplier');
    if (!isMissing(erpDraft.lot)) erpFilled++; else missing.push('Lot');
    if (!isMissing(erpDraft.size_ratio)) erpFilled++; else missing.push('Size Ratio');

    if (!isMissing(erpDraft.fabric_price) && (isNaN(parseFloat(erpDraft.fabric_price)) || parseFloat(erpDraft.fabric_price) < 0)) {
      missing.push('Valid Fabric Price');
    }

    // Pre-cut Fields
    let preCutFilled = 0;
    const preCutTotal = 10;
    if (!isMissingNumeric(preCutDraft.number_of_plies) && parseFloat(preCutDraft.number_of_plies) > 0) preCutFilled++; else missing.push('Number of Plies');
    if (!isMissingNumeric(preCutDraft.spread_length) && parseFloat(preCutDraft.spread_length) > 0) preCutFilled++; else missing.push('Spread Length');
    if (!isMissing(preCutDraft.splice_policy)) preCutFilled++; else missing.push('Splice Policy');
    if (!isMissingNumeric(preCutDraft.end_allowance) && parseFloat(preCutDraft.end_allowance) >= 0) preCutFilled++; else missing.push('End Allowance');
    if (!isMissingNumeric(preCutDraft.defects_per_lay) && parseFloat(preCutDraft.defects_per_lay) >= 0) preCutFilled++; else missing.push('Defects per Lay');
    if (!isMissingNumeric(preCutDraft.machine_width) && parseFloat(preCutDraft.machine_width) > 0) preCutFilled++; else missing.push('Machine Width');
    if (!isMissingNumeric(preCutDraft.cut_table_width) && parseFloat(preCutDraft.cut_table_width) > 0) preCutFilled++; else missing.push('Cut Table Width');
    if (!isMissingNumeric(preCutDraft.lay_height_limit) && parseFloat(preCutDraft.lay_height_limit) > 0) preCutFilled++; else missing.push('Lay Height Limit');
    if (!isMissing(preCutDraft.shift)) preCutFilled++; else missing.push('Shift');
    if (!isMissingNumeric(preCutDraft.review_threshold) && parseFloat(preCutDraft.review_threshold) > 0 && parseFloat(preCutDraft.review_threshold) < 100) preCutFilled++; else missing.push('Review Threshold');

    if (cadStatus !== 'ACCEPTED') missing.push('CAD Acceptance');

    const isBlocked = missing.length > 0;
    
    return { 
      status: isBlocked ? 'BLOCKED' : 'PASS', 
      message: isBlocked ? `Missing required fields: ${missing.join(', ')}` : 'All required ERP, CAD and pre-cut demonstration inputs are available. Post-cut actual waste is excluded from the prediction input. Demo leakage gate: PASS.',
      erpCounts: { filled: erpFilled, total: erpTotal },
      preCutCounts: { filled: preCutFilled, total: preCutTotal },
      missingFields: missing
    };
  };

  const gateResult = handleGateValidation();

  const handleNext = () => {
    if (activeStep === 3 && gateResult.status === 'BLOCKED') return; // Gate blocks
    if (activeStep === 3) {
      const newLocal = { ...localState, [runId]: { ...localState[runId], gatePassed: true } };
      setLocalState(newLocal);
    }
    setActiveStep(Math.min(STEPS.length - 1, activeStep + 1));
  };
  const handlePrev = () => setActiveStep(Math.max(0, activeStep - 1));

  if (loading) return <LoadingState message="Loading run details..." />;
  if (error) return (
    <div className="space-y-4">
      <ErrorState title="Failed to load run" message={error} />
      <button onClick={() => navigate('/c2')} className="text-blue-600 hover:underline">← Back to C2 Workspace</button>
    </div>
  );

  const runState = localState[runId] || {};
  const selectedStrategyId = runState.selected_strategy_id || null;
  const selectionStatus = runState.selection_status || 'NOT_SELECTED';
  const approvalStatus = runState.approval_status || 'NOT_REQUESTED';
  const approvalMetadata = runState.approval_metadata || null;

  const handleStrategySelect = (strat) => {
    const newLocal = { 
      ...localState, 
      [runId]: { 
        ...runState, 
        selected_strategy_id: strat.strategy_id,
        selection_status: 'SELECTED',
        approval_status: 'PENDING',
        export_status: 'DRAFT'
      } 
    };
    setLocalState(newLocal);

    // Create or update action
    const existingActionIdx = savedActions.findIndex(a => a.component_id === 'C2' && a.run_id === runId && a.action_type === 'STRATEGY_SELECTION');
    let updatedActions = [...savedActions];
    
    if (existingActionIdx >= 0) {
      if (updatedActions[existingActionIdx].status !== 'COMPLETED' && updatedActions[existingActionIdx].status !== 'CANCELLED') {
        updatedActions[existingActionIdx] = {
          ...updatedActions[existingActionIdx],
          selected_candidate: strat.strategy_id,
          status: 'PENDING',
          updated_at: new Date().toISOString()
        };
      }
    } else {
      updatedActions.unshift({
        id: `ACT-${Date.now()}`,
        component_id: 'C2',
        run_id: runId,
        entity_type: 'batch',
        entity_id: runData.batch_id,
        action_type: 'STRATEGY_SELECTION',
        selected_candidate: strat.strategy_id,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        action_route: `/c2/run/${runId}`
      });
    }
    setSavedActions(updatedActions);
  };

  const handleApproveStrategy = () => {
    if (window.confirm("Approve this strategy for cutting?")) {
      const newLocal = { 
        ...localState, 
        [runId]: { 
          ...runState, 
          approval_status: 'APPROVED',
          commit_status: 'NOT_COMMITTED',
          approval_metadata: {
            approved_by_role: userRole || 'Cutting Room Manager',
            approved_at: new Date().toISOString()
          }
        } 
      };
      setLocalState(newLocal);
      
      const existingActionIdx = savedActions.findIndex(a => a.component_id === 'C2' && a.run_id === runId && a.action_type === 'STRATEGY_SELECTION');
      if (existingActionIdx >= 0) {
        let updatedActions = [...savedActions];
        updatedActions[existingActionIdx].status = 'COMPLETED';
        updatedActions[existingActionIdx].updated_at = new Date().toISOString();
        setSavedActions(updatedActions);
      }
    }
  };

  const handleRejectStrategy = () => {
    if (window.confirm("Reject this strategy?")) {
      const newLocal = { 
        ...localState, 
        [runId]: { 
          ...runState, 
          approval_status: 'REJECTED',
          commit_status: 'NOT_COMMITTED'
        } 
      };
      setLocalState(newLocal);
      
      const existingActionIdx = savedActions.findIndex(a => a.component_id === 'C2' && a.run_id === runId && a.action_type === 'STRATEGY_SELECTION');
      if (existingActionIdx >= 0) {
        let updatedActions = [...savedActions];
        updatedActions[existingActionIdx].status = 'CANCELLED';
        updatedActions[existingActionIdx].updated_at = new Date().toISOString();
        setSavedActions(updatedActions);
      }
    }
  };

  const ProvenanceBadge = ({ classification }) => (
    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 text-right">
      <div className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <span className="font-bold text-gray-700">Output Mode:</span> DEMO_PRECOMPUTED | <span className="font-bold text-gray-700">Data Source:</span> Fixed JSON Fixture
      </div>
      {classification && (
        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold">
          Data Classification: {classification}
        </span>
      )}
      <p className="italic">Not a live production recommendation</p>
    </div>
  );

  const renderStep = () => {
    switch(activeStep) {
      case 0:
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-bold text-lg border-b pb-4 text-gray-800">ERP / Material Intake</h3>
            
            <div className="bg-orange-50 text-orange-800 p-4 rounded-lg text-sm flex gap-3 border border-orange-200">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Synthetic Demo Sample Input — editable for interface demonstration only. These values do not run or change the prediction model.</p>
                <p className="mt-1 opacity-90">Editable draft identifiers are used only for interface demonstration. The official fixture identity and current run route remain unchanged.</p>
                <p className="font-bold mt-2 text-[10px] uppercase tracking-wide bg-orange-100 max-w-max px-2 py-1 rounded border border-orange-200">Data Classification: SYNTHETIC_DEMONSTRATION</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <datalist id="factory-list">
                {factories.map(f => <option key={f.factory_id} value={f.factory_id}>{f.factory_name}</option>)}
              </datalist>
              <datalist id="batch-list">
                {batches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.batch_id}</option>)}
              </datalist>
              <datalist id="order-list">
                {orders.map(o => <option key={o.order_id} value={o.order_id}>{o.customer_name}</option>)}
              </datalist>
              <datalist id="style-list">
                {styles.map(s => <option key={s.style_id} value={s.style_id}>{s.style_name}</option>)}
              </datalist>
              
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Factory ID <span className="text-red-500">*</span></label>
                <input type="text" list="factory-list" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.factory_id ?? ''} onChange={e => updateDraft('erp', { ...erpDraft, factory_id: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Batch ID <span className="text-red-500">*</span></label>
                <input type="text" list="batch-list" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.batch_id ?? ''} onChange={e => updateDraft('erp', { ...erpDraft, batch_id: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Order ID <span className="text-red-500">*</span></label>
                <input type="text" list="order-list" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.order_id ?? ''} onChange={e => updateDraft('erp', { ...erpDraft, order_id: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Style ID <span className="text-red-500">*</span></label>
                <input type="text" list="style-list" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.style_id ?? ''} onChange={e => updateDraft('erp', { ...erpDraft, style_id: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Order Quantity <span className="text-red-500">*</span></label>
                <input type="number" className="w-full border border-gray-300 bg-white rounded p-2 text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.draft_order_quantity || ''} onChange={e => updateDraft('erp', { ...erpDraft, draft_order_quantity: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fabric Composition <span className="text-red-500">*</span></label>
                <input type="text" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.fabric_composition || ''} onChange={e => updateDraft('erp', { ...erpDraft, fabric_composition: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">GSM <span className="text-red-500">*</span></label>
                <div className="flex">
                  <input type="number" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.gsm || ''} onChange={e => updateDraft('erp', { ...erpDraft, gsm: e.target.value })} />
                  <span className="bg-gray-200 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600 uppercase">g/m²</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Supplier <span className="text-red-500">*</span></label>
                <input type="text" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.supplier || ''} onChange={e => updateDraft('erp', { ...erpDraft, supplier: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lot <span className="text-red-500">*</span></label>
                <input type="text" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.lot || ''} onChange={e => updateDraft('erp', { ...erpDraft, lot: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Size Ratio <span className="text-red-500">*</span></label>
                <input type="text" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.size_ratio || ''} onChange={e => updateDraft('erp', { ...erpDraft, size_ratio: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fabric Price</label>
                <div className="flex">
                  <span className="bg-gray-200 border border-gray-300 rounded-l px-3 flex items-center text-xs font-bold text-gray-600 uppercase">LKR/kg</span>
                  <input type="number" className="w-full border border-gray-300 bg-white rounded-r p-2 text-sm text-right border-l-0 focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.fabric_price || ''} onChange={e => updateDraft('erp', { ...erpDraft, fabric_price: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Planned Delivery Date</label>
                <input type="date" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={erpDraft.planned_delivery_date || ''} onChange={e => updateDraft('erp', { ...erpDraft, planned_delivery_date: e.target.value })} />
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                <Database className="w-3.5 h-3.5" /> Saved locally for this demonstration
              </span>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-bold text-lg border-b pb-4 text-gray-800">CAD / Marker</h3>
            
            {cadStatus === 'NOT_LOADED' && (
              <div className="p-8 bg-gray-50 rounded-lg text-center border-2 border-dashed border-gray-300 space-y-5">
                <p className="text-gray-600 font-medium">Upload CAD/Marker file to proceed</p>
                <div className="flex justify-center gap-4">
                  <label className="bg-blue-600 text-white px-5 py-2.5 rounded shadow hover:bg-blue-700 font-bold cursor-pointer transition-colors">
                    Upload Demo CAD File
                    <input type="file" className="hidden" onChange={handleCadUpload} />
                  </label>
                  <button onClick={handleUseFixedDemo} className="bg-white text-gray-800 px-5 py-2.5 rounded shadow hover:bg-gray-50 font-bold border border-gray-300 transition-colors">
                    Use Fixed Demo CAD Fixture
                  </button>
                </div>
                {cadError && <p className="text-red-600 text-sm font-bold">{cadError}</p>}
              </div>
            )}

            {(cadStatus === 'PREVIEW_READY' || cadStatus === 'ACCEPTED' || cadStatus === 'DEMO_FIXTURE_LOADED') && (
              <div className="space-y-6">
                <div className="bg-orange-50 text-orange-800 p-4 rounded-lg text-sm flex gap-3 border border-orange-200">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Demo CAD file selected. Fields are auto-filled from a fixed synthetic demonstration fixture. No live CAD parsing is performed.</p>
                    <div className="flex gap-2 mt-2">
                      <span className="font-bold text-[10px] uppercase tracking-wide bg-orange-100 px-2 py-1 rounded border border-orange-200">Output Mode: DEMO_PRECOMPUTED</span>
                      <span className="font-bold text-[10px] uppercase tracking-wide bg-orange-100 px-2 py-1 rounded border border-orange-200">Data Source: Fixed JSON Fixture</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column: Identity & Rules */}
                  <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-gray-50">
                     <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide border-b pb-2">Marker Identity & Rules</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Official Marker ID</label>
                          <input disabled className="w-full bg-gray-200 border border-gray-300 rounded p-2 text-sm text-gray-500 font-mono" value={runData.marker_id || 'MRK-00042'} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Draft Marker ID</label>
                          <input type="text" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-blue-500 outline-none" value={cadDraft.draft_marker_id || ''} onChange={e => updateDraft('cad', { ...cadDraft, draft_marker_id: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Marker File Name</label>
                          <input type="text" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-blue-500 outline-none" value={cadDraft.marker_file_name || ''} onChange={e => updateDraft('cad', { ...cadDraft, marker_file_name: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">CAD Version</label>
                          <input type="text" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-blue-500 outline-none" value={cadDraft.cad_version || ''} onChange={e => updateDraft('cad', { ...cadDraft, cad_version: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Grain Rule</label>
                          <input type="text" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-blue-500 outline-none" value={cadDraft.grain_rule || ''} onChange={e => updateDraft('cad', { ...cadDraft, grain_rule: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nap Rule</label>
                          <input type="text" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-blue-500 outline-none" value={cadDraft.nap_rule || ''} onChange={e => updateDraft('cad', { ...cadDraft, nap_rule: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Constraint Warning</label>
                          <input type="text" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-blue-500 outline-none" value={cadDraft.constraint_warning || ''} onChange={e => updateDraft('cad', { ...cadDraft, constraint_warning: e.target.value })} />
                        </div>
                     </div>
                  </div>
                  
                  {/* Right Column: Parser Status & Preview */}
                  <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white flex flex-col">
                     <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide border-b pb-2 flex justify-between items-center">
                       Parser Status & Preview
                       <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-blue-800 text-[10px] font-bold font-mono uppercase">{cadDraft.parser_status || 'NOT_PARSED'}</span>
                     </h4>
                     <div className="flex-grow flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-lg p-4 relative overflow-hidden h-40">
                        <div className="absolute left-10 w-16 h-20 border border-blue-400 bg-blue-100 opacity-80 rounded-sm"></div>
                        <div className="absolute left-32 w-20 h-14 border border-green-400 bg-green-100 opacity-80 rounded-sm"></div>
                        <div className="absolute right-12 w-14 h-24 border border-purple-400 bg-purple-100 opacity-80 rounded-sm"></div>
                        <p className="text-gray-500 font-bold font-mono text-sm relative z-10 bg-white px-3 py-1.5 rounded border border-gray-200 shadow-sm">Schematic {cadDraft.marker_width}m x {cadDraft.marker_length}m</p>
                     </div>
                     <p className="text-[10px] text-gray-400 italic text-center font-medium leading-tight">Illustrative precomputed marker preview — not generated from live CAD geometry. Demo parser placeholder — no live CAD parsing is performed.</p>
                  </div>
                </div>

                {/* Dimensions & Metrics */}
                <div className="border border-gray-200 rounded-lg p-5 bg-white">
                  <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide border-b pb-3 mb-4">Dimensions & Metrics</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Marker Width</label>
                      <div className="flex">
                        <input type="number" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={cadDraft.marker_width ?? ''} onChange={e => updateDraft('cad', { ...cadDraft, marker_width: e.target.value })} />
                        <span className="bg-gray-100 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">m</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Marker Length</label>
                      <div className="flex">
                        <input type="number" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={cadDraft.marker_length ?? ''} onChange={e => updateDraft('cad', { ...cadDraft, marker_length: e.target.value })} />
                        <span className="bg-gray-100 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">m</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Marker Efficiency</label>
                      <div className="flex">
                        <input type="number" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={cadDraft.marker_efficiency ?? ''} onChange={e => updateDraft('cad', { ...cadDraft, marker_efficiency: e.target.value })} />
                        <span className="bg-gray-100 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Total Piece Area</label>
                      <div className="flex">
                        <input type="number" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={cadDraft.total_piece_area ?? ''} onChange={e => updateDraft('cad', { ...cadDraft, total_piece_area: e.target.value })} />
                        <span className="bg-gray-100 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">m²</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Pattern Piece Count</label>
                      <input type="number" className="w-full border border-gray-300 bg-white rounded p-2 text-sm text-right focus:ring-blue-500 outline-none" value={cadDraft.pattern_piece_count ?? ''} onChange={e => updateDraft('cad', { ...cadDraft, pattern_piece_count: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Rotation Allowance</label>
                      <div className="flex">
                        <input type="number" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={cadDraft.rotation_allowance ?? ''} onChange={e => updateDraft('cad', { ...cadDraft, rotation_allowance: e.target.value })} />
                        <span className="bg-gray-100 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">°</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Spacing</label>
                      <div className="flex">
                        <input type="number" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={cadDraft.spacing ?? ''} onChange={e => updateDraft('cad', { ...cadDraft, spacing: e.target.value })} />
                        <span className="bg-gray-100 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">cm</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Compactness</label>
                      <input type="text" className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-blue-500 outline-none" value={cadDraft.compactness || ''} onChange={e => updateDraft('cad', { ...cadDraft, compactness: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-5 bg-white">
                  <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide border-b pb-3 mb-4">Pattern Piece Summary</h4>
                  <div className="bg-gray-50 p-3 rounded mb-4 border border-gray-200 text-xs text-gray-500 font-medium">
                    Pattern-piece rows are synthetic demonstration data and are not parsed from an uploaded CAD file.
                  </div>
                  <div className="overflow-x-auto rounded border border-gray-200">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-100 text-gray-700 border-b border-gray-200">
                        <tr>
                          <th className="p-3 font-bold">Part Name</th>
                          <th className="p-3 font-bold">Size</th>
                          <th className="p-3 font-bold text-right">Qty</th>
                          <th className="p-3 font-bold text-right">Total Area (m²)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(cadDraft.pattern_piece_summary || []).map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-100 bg-white even:bg-gray-50 hover:bg-blue-50 transition-colors">
                            <td className="p-3 font-medium text-gray-800">{row.part_name}</td>
                            <td className="p-3 text-gray-600">{row.size}</td>
                            <td className="p-3 text-right font-mono text-gray-800">{row.quantity}</td>
                            <td className="p-3 text-right font-mono text-gray-800">{row.area}</td>
                          </tr>
                        ))}
                        {(!cadDraft.pattern_piece_summary || cadDraft.pattern_piece_summary.length === 0) && (
                          <tr>
                            <td colSpan="4" className="p-6 text-center text-gray-500 italic">No summary data available.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded border border-gray-200 mr-4">
                    <Database className="w-3.5 h-3.5" /> Saved locally for this demonstration
                  </span>
                  {cadStatus === 'PREVIEW_READY' && (
                    <button onClick={acceptCad} className="bg-blue-600 text-white px-8 py-2.5 rounded font-bold hover:bg-blue-700 transition-colors shadow">
                      Accept & Continue
                    </button>
                  )}
                  {cadStatus === 'ACCEPTED' && (
                    <div className="bg-green-50 text-green-700 px-6 py-2.5 rounded font-bold flex items-center justify-center gap-2 border border-green-200">
                      <CheckCircle2 className="w-5 h-5"/> CAD Accepted
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-bold text-lg border-b pb-4 text-gray-800">Pre-cut Parameters</h3>
            
            <div className="bg-orange-50 text-orange-800 p-4 rounded-lg text-sm flex gap-3 border border-orange-200">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Synthetic Demo Sample Input — editable for interface demonstration only. These values do not run or change the prediction model.</p>
                <p className="font-bold mt-2 text-[10px] uppercase tracking-wide bg-orange-100 max-w-max px-2 py-1 rounded border border-orange-200">Data Classification: SYNTHETIC_DEMONSTRATION</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Number of Plies <span className="text-red-500">*</span></label>
                <input type="number" className="w-full border border-gray-300 bg-white rounded p-2 text-sm text-right focus:ring-blue-500 outline-none" value={preCutDraft.number_of_plies ?? ''} onChange={e => updateDraft('preCut', { ...preCutDraft, number_of_plies: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Spread Length <span className="text-red-500">*</span></label>
                <div className="flex">
                  <input type="number" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={preCutDraft.spread_length ?? ''} onChange={e => updateDraft('preCut', { ...preCutDraft, spread_length: e.target.value })} />
                  <span className="bg-gray-200 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">m</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Splice Policy <span className="text-red-500">*</span></label>
                <select className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-blue-500 outline-none" value={preCutDraft.splice_policy || ''} onChange={e => updateDraft('preCut', { ...preCutDraft, splice_policy: e.target.value })}>
                  <option value="ALLOW_WITH_REVIEW">Allow with review</option>
                  <option value="STRICT_NO_SPLICE">Strict no splice</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">End Allowance <span className="text-red-500">*</span></label>
                <div className="flex">
                  <input type="number" step="0.01" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={preCutDraft.end_allowance ?? ''} onChange={e => updateDraft('preCut', { ...preCutDraft, end_allowance: e.target.value })} />
                  <span className="bg-gray-200 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">m</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Defects per Lay <span className="text-red-500">*</span></label>
                <input type="number" className="w-full border border-gray-300 bg-white rounded p-2 text-sm text-right focus:ring-blue-500 outline-none" value={preCutDraft.defects_per_lay ?? ''} onChange={e => updateDraft('preCut', { ...preCutDraft, defects_per_lay: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Machine Width <span className="text-red-500">*</span></label>
                <div className="flex">
                  <input type="number" step="0.1" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={preCutDraft.machine_width ?? ''} onChange={e => updateDraft('preCut', { ...preCutDraft, machine_width: e.target.value })} />
                  <span className="bg-gray-200 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">m</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cut Table Width <span className="text-red-500">*</span></label>
                <div className="flex">
                  <input type="number" step="0.1" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={preCutDraft.cut_table_width ?? ''} onChange={e => updateDraft('preCut', { ...preCutDraft, cut_table_width: e.target.value })} />
                  <span className="bg-gray-200 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">m</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lay Height Limit <span className="text-red-500">*</span></label>
                <div className="flex">
                  <input type="number" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={preCutDraft.lay_height_limit ?? ''} onChange={e => updateDraft('preCut', { ...preCutDraft, lay_height_limit: e.target.value })} />
                  <span className="bg-gray-200 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">mm</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Shift <span className="text-red-500">*</span></label>
                <select className="w-full border border-gray-300 bg-white rounded p-2 text-sm focus:ring-blue-500 outline-none" value={preCutDraft.shift || ''} onChange={e => updateDraft('preCut', { ...preCutDraft, shift: e.target.value })}>
                  <option value="SHIFT-A">SHIFT-A</option>
                  <option value="SHIFT-B">SHIFT-B</option>
                  <option value="SHIFT-C">SHIFT-C</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Configured Demo Review Threshold <span className="text-red-500">*</span></label>
                <div className="flex">
                  <input type="number" className="w-full border border-gray-300 bg-white rounded-l p-2 text-sm text-right border-r-0 focus:ring-blue-500 outline-none" value={preCutDraft.review_threshold ?? ''} onChange={e => updateDraft('preCut', { ...preCutDraft, review_threshold: e.target.value })} />
                  <span className="bg-gray-200 border border-gray-300 rounded-r px-3 flex items-center text-xs font-bold text-gray-600">%</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                <Database className="w-3.5 h-3.5" /> Saved locally for this demonstration
              </span>
            </div>
          </div>
        );
      case 3:
        const gatePass = gateResult.status !== 'BLOCKED';
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-bold text-lg border-b pb-4 text-gray-800">Leakage and Data Gate</h3>
            
            {gatePass ? (
              <div className="bg-green-50 text-green-800 p-4 rounded-lg flex gap-3 border border-green-200 items-center">
                <CheckCircle2 className="w-6 h-6 shrink-0 text-green-600" />
                <span className="font-bold text-sm tracking-wide">PASS — All required ERP, CAD and pre-cut demonstration inputs are available.</span>
              </div>
            ) : (
              <div className="bg-red-50 text-red-800 p-4 rounded-lg flex gap-3 border border-red-200 items-center">
                <XCircle className="w-6 h-6 shrink-0 text-red-600" />
                <span className="font-bold text-sm tracking-wide">BLOCKED — Missing required fields: {gateResult.missingFields.join(', ')}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border border-blue-200 bg-blue-50 p-5 rounded-lg">
                  <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-3 text-sm uppercase tracking-wide">
                    <ShieldCheck className="w-5 h-5" /> Leakage Boundary
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1.5 ml-6 list-disc font-medium">
                    <li>ERP + CAD + Pre-cut inputs are allowed demonstration inputs.</li>
                    <li>Post-cut actual waste is excluded from prediction.</li>
                    <li>Post-cut actual waste is used only for Step 8 validation.</li>
                    <li>Post-cut values do not retrain or overwrite the fixed prediction.</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 border-b border-gray-200 text-gray-700">
                      <tr>
                        <th className="p-3 font-bold uppercase text-xs tracking-wider">Data Domain</th>
                        <th className="p-3 font-bold uppercase text-xs tracking-wider">Source</th>
                        <th className="p-3 font-bold uppercase text-xs tracking-wider text-center">Coverage</th>
                        <th className="p-3 font-bold uppercase text-xs tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-bold text-gray-800">ERP / Material</td>
                        <td className="p-3 text-gray-500 font-medium">Draft Input</td>
                        <td className="p-3 text-center font-mono font-medium">{gateResult.erpCounts.filled} / {gateResult.erpCounts.total}</td>
                        <td className="p-3 text-center">
                          {gateResult.erpCounts.filled === gateResult.erpCounts.total ? (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold border border-green-200"><CheckCircle2 className="w-3.5 h-3.5"/> PASS</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-200"><XCircle className="w-3.5 h-3.5"/> BLOCKED</span>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-bold text-gray-800">CAD / Marker</td>
                        <td className="p-3 text-gray-500 font-medium">Demo Fixture</td>
                        <td className="p-3 text-center font-mono font-medium">15 / 15</td>
                        <td className="p-3 text-center">
                          {cadStatus === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold border border-green-200"><CheckCircle2 className="w-3.5 h-3.5"/> PASS</span>
                          ) : cadStatus === 'PREVIEW_READY' ? (
                            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold border border-orange-200"><AlertTriangle className="w-3.5 h-3.5"/> READY</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-200"><XCircle className="w-3.5 h-3.5"/> BLOCKED</span>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-bold text-gray-800">Pre-cut Operations</td>
                        <td className="p-3 text-gray-500 font-medium">Draft Input</td>
                        <td className="p-3 text-center font-mono font-medium">{gateResult.preCutCounts.filled} / {gateResult.preCutCounts.total}</td>
                        <td className="p-3 text-center">
                          {gateResult.preCutCounts.filled === gateResult.preCutCounts.total ? (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold border border-green-200"><CheckCircle2 className="w-3.5 h-3.5"/> PASS</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-200"><XCircle className="w-3.5 h-3.5"/> BLOCKED</span>
                          )}
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="p-3 font-bold text-gray-600">Post-cut Actuals</td>
                        <td className="p-3 text-gray-400 font-medium">Post-cut Module</td>
                        <td colSpan="2" className="p-3 italic text-gray-500 font-medium text-center">Excluded from prediction — Validation only</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 p-5 rounded-lg bg-gray-50 h-full">
                  <h4 className="font-bold text-gray-800 mb-4 uppercase text-sm tracking-wide border-b border-gray-200 pb-2">Validation Checklist</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3">
                      {gateResult.erpCounts.filled === gateResult.erpCounts.total ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0"/> : <XCircle className="w-5 h-5 text-red-500 shrink-0"/>}
                      <span className={gateResult.erpCounts.filled === gateResult.erpCounts.total ? 'text-gray-700 font-medium' : 'text-red-700 font-bold'}>Required ERP fields available {gateResult.erpCounts.filled !== gateResult.erpCounts.total && `(${gateResult.erpCounts.filled}/${gateResult.erpCounts.total})`}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      {cadStatus === 'ACCEPTED' ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0"/> : <XCircle className="w-5 h-5 text-red-500 shrink-0"/>}
                      <span className={cadStatus === 'ACCEPTED' ? 'text-gray-700 font-medium' : 'text-red-700 font-bold'}>Required CAD fields available {cadStatus === 'PREVIEW_READY' && '(READY FOR ACCEPTANCE)'}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      {gateResult.preCutCounts.filled === gateResult.preCutCounts.total ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0"/> : <XCircle className="w-5 h-5 text-red-500 shrink-0"/>}
                      <span className={gateResult.preCutCounts.filled === gateResult.preCutCounts.total ? 'text-gray-700 font-medium' : 'text-red-700 font-bold'}>Required pre-cut fields available {gateResult.preCutCounts.filled !== gateResult.preCutCounts.total && `(${gateResult.preCutCounts.filled}/${gateResult.preCutCounts.total})`}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0"/>
                      <span className="text-gray-700 font-medium">Official run identity mapped <span className="font-bold text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded ml-1">PROTECTED</span></span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0"/>
                      <span className="text-gray-700">Post-cut actual waste excluded <span className="font-bold text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded ml-1">EXCLUDED</span></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500"/>
                      <span className="text-gray-700">Fixed demo output protected <span className="font-bold text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded ml-1">PROTECTED</span></span>
                    </li>
                  </ul>
                </div>

                <div className="border border-gray-200 p-4 rounded-lg space-y-2 text-sm bg-white">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-3"><Database className="w-4 h-4 text-gray-600" /> Data Provenance</h4>
                  <div className="grid grid-cols-[110px_1fr] gap-y-2 items-center">
                    <span className="text-gray-500">Output Mode:</span>
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded max-w-max">DEMO_PRECOMPUTED</span>
                    
                    <span className="text-gray-500">Data Source:</span>
                    <span className="font-medium text-gray-800">Fixed JSON Fixture</span>
                    
                    <span className="text-gray-500">Classification:</span>
                    <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded max-w-max">SYNTHETIC_DEMONSTRATION</span>
                    
                    <span className="text-gray-500">Live Prediction:</span>
                    <span className="font-bold text-gray-800">No</span>
                  </div>
                </div>
              </div>
            </div>

            {gateResult.status === 'PASS' ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-start gap-3 border border-green-200">
                  <CheckCircle2 className="w-6 h-6 shrink-0 text-green-600 mt-0.5" /> 
                  <div className="font-medium">{gateResult.message}</div>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  <span className="font-bold text-gray-800">What Happens Next:</span> Next, review the fixed precomputed waste output and model-attributed contributors. No live prediction recalculation is performed in this prototype.
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg flex flex-col gap-3 border border-red-200">
                <div className="flex items-center gap-2 font-bold text-lg"><XCircle className="w-6 h-6 text-red-600" /> Data Gate BLOCKED</div>
                <p className="font-medium">{gateResult.message}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={() => setActiveStep(0)} className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 transition-colors">Review ERP Inputs</button>
                  <button onClick={() => setActiveStep(1)} className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 transition-colors">Review CAD Inputs</button>
                  <button onClick={() => setActiveStep(2)} className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 transition-colors">Review Pre-cut Inputs</button>
                </div>
              </div>
            )}
          </div>
        );
      case 4:
        const threshold = parseFloat(preCutDraft.review_threshold || 8);
        const predicted = runData.predicted_realised_waste_pct;
        const issuedWeight = runData.issued_fabric_weight_kg || 0;
        const costBasis = runData.fabric_cost_basis_lkr_per_kg || 0;
        const wasteWeight = runData.estimated_waste_weight_kg || 0;
        const wasteValue = runData.estimated_waste_value_lkr || 0;
        
        const isHighWaste = predicted > threshold;
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-bold text-lg border-b pb-4 text-gray-800">Precomputed Predicted Waste</h3>
            
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm flex gap-3 border border-yellow-200 items-start">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Waste weight and monetary value are fixed demonstration estimates derived from the precomputed waste rate and fixed demo cost basis. They are not live factory results.</p>
                <div className="flex gap-2 mt-2">
                  <span className="font-bold text-[10px] uppercase tracking-wide bg-yellow-100 px-2 py-1 rounded border border-yellow-300">Data Source: Fixed JSON Fixture</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <div className={`p-6 rounded-xl text-center border-2 flex flex-col justify-center shadow-sm relative overflow-hidden ${isHighWaste ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                {isHighWaste && <div className="absolute top-0 inset-x-0 h-1.5 bg-red-500"></div>}
                {!isHighWaste && <div className="absolute top-0 inset-x-0 h-1.5 bg-green-500"></div>}
                <p className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wide">Predicted Waste Rate</p>
                <p className={`text-5xl font-black ${isHighWaste ? 'text-red-700' : 'text-green-700'}`}>{predicted}%</p>
                <p className="text-[10px] uppercase font-bold mt-2 text-gray-400">Fixed precomputed demo output</p>
              </div>
              <div className="p-6 bg-white rounded-xl text-center border border-gray-200 shadow-sm flex flex-col justify-center">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wide">Estimated Waste Weight</p>
                <p className="text-4xl font-bold text-gray-800">{wasteWeight} <span className="text-xl text-gray-500 font-normal">kg</span></p>
                <p className="text-[10px] uppercase font-bold mt-2 text-gray-400">Fixed precomputed demo output</p>
              </div>
              <div className="p-6 bg-white rounded-xl text-center border border-gray-200 shadow-sm flex flex-col justify-center">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wide">Estimated Material-Loss Value</p>
                <p className="text-4xl font-bold text-gray-800"><span className="text-xl text-gray-500 font-normal mr-1">LKR</span>{wasteValue.toLocaleString()}</p>
                <p className="text-[10px] uppercase font-bold mt-2 text-gray-400">Fixed demo cost basis</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50 h-full flex flex-col">
                <h4 className="font-bold text-gray-800 text-sm mb-4 uppercase tracking-wide border-b border-gray-200 pb-2">Fixed Demo Basis</h4>
                <div className="space-y-3 text-sm flex-grow">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Issued Fabric Weight</span>
                    <span className="font-mono font-bold text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">{issuedWeight} kg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Fixed Demo Cost Basis</span>
                    <span className="font-mono font-bold text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">LKR {costBasis}/kg</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-3">
                    <span className="text-gray-600 font-bold">Configured Review Threshold</span>
                    <span className="font-mono font-bold text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">{threshold}%</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-5 bg-white h-full flex flex-col">
                <h4 className="font-bold text-gray-800 text-sm mb-4 uppercase tracking-wide border-b border-gray-200 pb-2">Calculation Model</h4>
                <div className="space-y-4 font-mono text-xs text-gray-700 bg-slate-50 p-4 rounded border border-slate-200 flex-grow">
                  <div className="space-y-1">
                    <span className="block text-slate-500 font-bold">// Estimated waste weight:</span>
                    <span className="flex items-center gap-2">
                      <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{issuedWeight} kg</span> 
                      <span className="text-slate-400">&times;</span> 
                      <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{predicted}%</span> 
                      <span className="text-slate-400">&approx;</span> 
                      <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{wasteWeight} kg</span>
                    </span>
                  </div>
                  <div className="space-y-1 pt-2">
                    <span className="block text-slate-500 font-bold">// Estimated material-loss value:</span>
                    <span className="flex items-center gap-2">
                      <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{wasteWeight} kg</span> 
                      <span className="text-slate-400">&times;</span> 
                      <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">LKR {costBasis}/kg</span> 
                      <span className="text-slate-400">=</span> 
                      <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">LKR {wasteValue.toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2">
              {isHighWaste ? (
                <div className="bg-red-50 text-red-800 p-4 rounded-lg text-sm font-bold flex justify-center items-center gap-2 border border-red-300 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  HIGH-WASTE REVIEW TRIGGERED. Precomputed rate ({predicted}%) exceeds configured threshold ({threshold}%).
                </div>
              ) : (
                <div className="bg-green-50 text-green-800 p-4 rounded-lg text-sm font-bold flex justify-center items-center gap-2 border border-green-300 shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Baseline path may continue.
                </div>
              )}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-bold text-lg border-b pb-4 text-gray-800">Top Prediction Drivers — Precomputed Model Attribution</h3>
            
            <div className="bg-orange-50 text-orange-800 p-4 rounded-lg text-sm flex gap-3 border border-orange-200">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">These contributors describe model attribution only. They do not prove the physical root cause of waste.</p>
                <div className="flex gap-2 mt-2">
                  <span className="font-bold text-[10px] uppercase tracking-wide bg-orange-100 px-2 py-1 rounded border border-orange-200">Data Classification: SYNTHETIC_DEMONSTRATION</span>
                </div>
              </div>
            </div>
            
            {contributors.length > 0 ? (() => {
              const maxAbsValue = Math.max(...contributors.map(c => Math.abs(c.contribution_value || 0)));
              
              return (
                <div className="space-y-3 pt-2">
                  {contributors.map((c, idx) => {
                    const isIncrease = c.contribution_direction === 'INCREASE';
                    const label = isIncrease ? 'Increased predicted waste' : 'Reduced predicted waste';
                    const colorClass = isIncrease ? 'bg-orange-500' : 'bg-blue-500';
                    const lightColorClass = isIncrease ? 'bg-orange-50' : 'bg-blue-50';
                    const textColorClass = isIncrease ? 'text-orange-700' : 'text-blue-700';
                    
                    return (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200 shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-gray-600 text-xs font-bold font-mono border border-gray-200">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-gray-800 text-sm">{c.display_label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {c.contribution_value !== undefined && (
                              <span className="font-mono text-xs font-medium text-gray-500">
                                {isIncrease ? '+' : ''}{Number(c.contribution_value).toFixed(4)}
                              </span>
                            )}
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${textColorClass} ${lightColorClass} ${isIncrease ? 'border-orange-200' : 'border-blue-200'}`}>
                              {label}
                            </span>
                          </div>
                        </div>
                        {c.contribution_value !== undefined && maxAbsValue > 0 && (
                          <div className="w-full h-1.5 flex rounded overflow-hidden bg-transparent">
                            <div className={`${colorClass} h-full`} style={{ width: `${(Math.abs(c.contribution_value) / maxAbsValue) * 100}%` }}></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <div className="p-8 bg-gray-50 rounded text-center text-gray-500 border border-gray-200 font-medium">
                No precomputed contributor data is available for this run.
              </div>
            )}
          </div>
        );
      case 6:
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-bold text-lg border-b pb-4 text-gray-800">Strategy Comparison</h3>
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead className="bg-gray-100 text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-bold uppercase text-xs tracking-wider">Candidate</th>
                    <th className="p-4 font-bold uppercase text-xs tracking-wider text-right">Pred. Waste</th>
                    <th className="p-4 font-bold uppercase text-xs tracking-wider text-right">Efficiency</th>
                    <th className="p-4 font-bold uppercase text-xs tracking-wider text-right">Simulated Fabric Saving</th>
                    <th className="p-4 font-bold uppercase text-xs tracking-wider text-center">Manufacturability</th>
                    <th className="p-4 font-bold uppercase text-xs tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map(strat => {
                    const isSelected = selectedStrategyId === strat.strategy_id;
                    const isBaseline = strat.strategy_id === 'STRAT-C2-BASE';
                    return (
                    <tr key={strat.strategy_id} className={`border-b border-gray-100 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{strat.strategy_name}</span>
                          {isBaseline && <span className="text-[9px] uppercase font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Baseline</span>}
                          {!isBaseline && <span className="text-[9px] uppercase font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">Candidate</span>}
                        </div>
                        <span className="text-xs text-gray-500 font-mono mt-1 block">{strat.strategy_id}</span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-gray-800">{strat.predicted_waste_pct}%</td>
                      <td className="p-4 text-right font-mono text-gray-600">{strat.marker_efficiency}%</td>
                      <td className="p-4 text-right">
                        {strat.estimated_fabric_saving > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">{strat.estimated_fabric_saving}%</span>
                            <span className="text-[9px] text-gray-400 mt-1 max-w-[120px] leading-tight italic">Simulated demonstration value — not a guaranteed factory result.</span>
                          </div>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-medium text-gray-700">{strat.manufacturability}</span>
                        {strat.strategy_id === 'STRAT-C2-LOWWASTE' && <span className="block text-[9px] font-bold text-orange-600 uppercase mt-1">Requires Review</span>}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleStrategySelect(strat)}
                          className={`px-4 py-2 rounded text-xs font-bold shadow-sm transition-colors ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-700' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                        >
                          {isSelected ? 'SELECTED' : 'SELECT'}
                        </button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            <div className="mt-8 space-y-6 border-t border-gray-200 pt-6">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">Candidate Marker Previews</h4>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200 font-bold uppercase tracking-wider">Output Mode: DEMO_PRECOMPUTED</span>
                  <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200 font-bold uppercase tracking-wider">Data Source: Fixed JSON Fixture</span>
                  <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-200 font-bold uppercase tracking-wider">Not a live production recommendation</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6">
                {strategies.map(strat => (
                  <div key={`preview-${strat.strategy_id}`} className={`border rounded-xl overflow-hidden flex flex-col bg-white transition-all ${selectedStrategyId === strat.strategy_id ? 'border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]' : 'border-gray-200 shadow-sm hover:border-gray-300'}`}>
                    <div className={`p-4 border-b ${selectedStrategyId === strat.strategy_id ? 'bg-blue-50' : 'bg-gray-50'} flex justify-between items-start`}>
                      <div>
                        <h5 className="font-bold text-sm text-gray-900 leading-tight">{strat.strategy_name}</h5>
                        <p className="text-[10px] text-gray-500 font-mono mt-1">{strat.strategy_id}</p>
                      </div>
                      {selectedStrategyId === strat.strategy_id && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded border border-blue-700 uppercase shrink-0 ml-2">Selected</span>
                      )}
                    </div>
                    
                    <div className="p-5 flex-grow flex flex-col space-y-5">
                      <div className="text-xs space-y-2.5 text-gray-700">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2"><span className="text-gray-500 font-medium">Predicted Waste:</span><span className="font-mono font-bold text-gray-900 text-sm">{strat.predicted_waste_pct}%</span></div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2"><span className="text-gray-500 font-medium">Efficiency:</span><span className="font-mono text-gray-800">{strat.marker_efficiency}%</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Manufacturability:</span><span className="font-medium text-gray-800">{strat.manufacturability}</span></div>
                      </div>
                      
                      {strat.strategy_id === 'STRAT-C2-LOWWASTE' && (
                        <div className="bg-orange-50 border border-orange-200 text-orange-800 text-xs p-3 rounded-lg font-bold flex gap-2 items-center">
                          <AlertTriangle className="w-5 h-5 shrink-0 text-orange-600"/> <span>Requires human manufacturability review.</span>
                        </div>
                      )}

                      <div className="pt-2 mt-auto">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 text-center tracking-wide">
                          {strat.strategy_id === 'STRAT-C2-BASE' && 'Illustrative baseline density schematic'}
                          {strat.strategy_id === 'STRAT-C2-GANFP' && 'Illustrative alternative density schematic'}
                          {strat.strategy_id === 'STRAT-C2-LOWWASTE' && 'Illustrative constrained density schematic'}
                        </p>
                        <div className="border border-gray-200 bg-gray-50 rounded-lg p-2 h-28 flex items-center justify-center overflow-hidden">
                        {strat.strategy_id === 'STRAT-C2-BASE' && (
                          <div className="flex gap-1.5 w-full h-16 bg-white border border-gray-300 p-1.5 rounded-sm shadow-sm">
                            <div className="bg-blue-100 w-1/3 h-full border border-blue-400 rounded-sm"></div>
                            <div className="bg-green-100 w-1/4 h-full border border-green-400 rounded-sm"></div>
                            <div className="bg-purple-100 w-1/5 h-full border border-purple-400 rounded-sm"></div>
                          </div>
                        )}
                        {strat.strategy_id === 'STRAT-C2-GANFP' && (
                          <div className="flex gap-1 w-full h-16 bg-white border border-gray-300 p-1.5 items-end rounded-sm shadow-sm">
                            <div className="bg-blue-100 w-[30%] h-[90%] border border-blue-400 rounded-sm"></div>
                            <div className="bg-green-100 w-[25%] h-full border border-green-400 rounded-sm"></div>
                            <div className="bg-purple-100 w-[20%] h-[85%] border border-purple-400 rounded-sm"></div>
                            <div className="bg-yellow-100 w-[15%] h-[95%] border border-yellow-400 rounded-sm"></div>
                          </div>
                        )}
                        {strat.strategy_id === 'STRAT-C2-LOWWASTE' && (
                          <div className="flex flex-wrap gap-1 w-full h-24 bg-white border border-gray-300 p-1.5 content-start justify-center rounded-sm shadow-sm">
                            <div className="bg-blue-100 w-[46%] h-[46%] border border-blue-400 rounded-sm"></div>
                            <div className="bg-green-100 w-[46%] h-[46%] border border-green-400 rounded-sm"></div>
                            <div className="bg-purple-100 w-[29%] h-[46%] border border-purple-400 rounded-sm"></div>
                            <div className="bg-yellow-100 w-[31%] h-[46%] border border-yellow-400 rounded-sm"></div>
                            <div className="bg-red-100 w-[29%] h-[46%] border border-red-400 rounded-sm"></div>
                          </div>
                        )}
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 italic text-center leading-tight">Illustrative precomputed marker preview — not generated from live CAD geometry.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Approval Workflow */}
            {selectionStatus === 'SELECTED' && (
              <div className="bg-blue-50 p-5 border border-blue-200 rounded-xl flex flex-wrap gap-4 items-center justify-between mt-8">
                <div>
                  <p className="font-bold text-blue-900 uppercase text-xs tracking-wider mb-1">Strategy Status</p>
                  <p className="font-bold text-blue-800 text-lg">{approvalStatus}</p>
                  {approvalStatus === 'APPROVED' && approvalMetadata && (
                    <p className="text-xs text-blue-700 mt-1 font-medium">
                      Approved by {approvalMetadata.approved_by_role} at {new Date(approvalMetadata.approved_at).toLocaleString()}
                    </p>
                  )}
                </div>
                {approvalStatus === 'PENDING' && (
                  <div className="flex gap-3">
                    <button 
                      onClick={handleRejectStrategy}
                      className="px-5 py-2.5 bg-white border border-red-300 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                    >
                      Reject Strategy
                    </button>
                    <button 
                      onClick={handleApproveStrategy}
                      className="px-5 py-2.5 bg-green-600 border border-green-700 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                      Approve Strategy
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 7:
        const validationLocal = runState.validation || { actual_waste_percent: '' };
        
        let varianceText = null;
        if (validationLocal.actual_waste_percent) {
          const actual = parseFloat(validationLocal.actual_waste_percent);
          const predicted = runData.predicted_realised_waste_pct;
          const variance = actual - predicted;
          varianceText = `${variance > 0 ? '+' : ''}${variance.toFixed(1)} percentage points`;
        }
        const exportStatus = runState.export_status || 'NOT_EXPORTED';

        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <h3 className="font-bold text-lg border-b pb-4 text-gray-800">Export / Post-cut Validation</h3>
              <div className="grid grid-cols-2 gap-8">
                {/* Left Column: Export Summary */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Export Summary</h4>
                  <div className="text-sm space-y-2 bg-gray-50 p-5 rounded-xl border border-gray-200 relative h-[220px] flex flex-col justify-between">
                    {approvalStatus !== 'APPROVED' && (
                      <span className="absolute top-4 right-4 text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded border border-orange-200 uppercase tracking-wider">DRAFT</span>
                    )}
                    <div className="space-y-2">
                      <p className="flex justify-between border-b border-gray-100 pb-1"><span className="text-gray-500">Run:</span><span className="font-mono font-bold text-gray-800">{runData.run_id}</span></p>
                      <p className="flex justify-between border-b border-gray-100 pb-1"><span className="text-gray-500">Batch:</span><span className="font-mono font-bold text-gray-800">{runData.batch_id}</span></p>
                      <p className="flex justify-between border-b border-gray-100 pb-1"><span className="text-gray-500">Selected Strategy:</span><span className="font-mono font-bold text-gray-800">{selectedStrategyId || 'None'}</span></p>
                      <p className="flex justify-between border-b border-gray-100 pb-1"><span className="text-gray-500">Predicted Waste:</span><span className="font-mono font-bold text-gray-800">{runData.predicted_realised_waste_pct}%</span></p>
                      <p className="flex justify-between border-b border-gray-100 pb-1"><span className="text-gray-500">Approval Status:</span><span className="font-bold text-gray-800">{approvalStatus}</span></p>
                      <p className="flex justify-between"><span className="text-gray-500">Export Status:</span><span className="font-bold text-blue-700">{exportStatus}</span></p>
                    </div>
                  </div>
                  <button 
                    disabled={approvalStatus !== 'APPROVED'} 
                    onClick={() => {
                      const varianceValue = validationLocal.actual_waste_percent ? 
                        parseFloat(validationLocal.actual_waste_percent) - runData.predicted_realised_waste_pct : null;
                      
                      const exportData = {
                        output_mode: outputMode || 'DEMO_PRECOMPUTED',
                        official_identity: {
                          run_id: runData.run_id,
                          batch_id: runData.batch_id,
                          order_id: runData.order_id,
                          style_id: runData.style_id,
                          factory_id: runData.factory_id
                        },
                        draft_input_identity: {
                          draft_factory_id: erpDraft.factory_id,
                          draft_batch_id: erpDraft.batch_id,
                          draft_order_id: erpDraft.order_id,
                          draft_style_id: erpDraft.style_id
                        },
                        draft_cad_identity: cadDraft.draft_marker_id ? {
                          draft_marker_id: cadDraft.draft_marker_id,
                          marker_file_name: cadDraft.marker_file_name
                        } : undefined,
                        selected_strategy_id: selectedStrategyId,
                        selection_status: selectionStatus,
                        approval_status: approvalStatus,
                        export_status: 'EXPORTED',
                        predicted_waste_percent: runData.predicted_realised_waste_pct,
                        limitation_statement: "Demo / Precomputed Output — Not a live production recommendation."
                      };
                      
                      if (approvalMetadata && approvalMetadata.approved_by_role) {
                        exportData.approved_by_role = approvalMetadata.approved_by_role;
                      }
                      if (approvalMetadata && approvalMetadata.approved_at) {
                        exportData.approved_at = approvalMetadata.approved_at;
                      }
                      if (validationLocal.actual_waste_percent) {
                        exportData.actual_waste_percent = parseFloat(validationLocal.actual_waste_percent);
                        exportData.variance_percentage_points = varianceValue;
                      }
                      
                      const jsonStr = JSON.stringify(exportData, null, 2);
                      const blob = new Blob([jsonStr], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `C2_Export_${runData.run_id}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);

                      const newLocal = { ...localState, [runId]: { ...runState, export_status: 'EXPORTED' } };
                      setLocalState(newLocal);
                    }}
                    className={`w-full px-5 py-3 rounded-lg text-sm font-bold shadow-sm transition-colors ${approvalStatus === 'APPROVED' ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'}`}
                  >
                    {approvalStatus === 'APPROVED' ? 'Download JSON Summary' : 'Approve Strategy to Export'}
                  </button>
                </div>
                
                {/* Right Column: Post-cut Validation */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Post-cut Validation</h4>
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 h-[220px] flex flex-col justify-center">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Actual Waste (%)</label>
                        <input type="number" step="0.1" className="w-full border border-gray-300 bg-white rounded-lg p-3 text-lg font-mono focus:ring-blue-500 outline-none shadow-sm" value={validationLocal.actual_waste_percent} 
                          onChange={e => {
                            const newLocal = { ...localState, [runId]: { ...runState, validation: { actual_waste_percent: e.target.value } } };
                            setLocalState(newLocal);
                          }} 
                          placeholder="e.g. 12.5"
                        />
                      </div>
                      {varianceText ? (
                        <div className="text-sm bg-white p-3 rounded-lg font-medium border border-gray-200 shadow-sm flex justify-between items-center">
                          <span className="text-gray-500 uppercase text-xs font-bold">Variance:</span>
                          <span className={`font-mono font-bold text-lg ${varianceText.startsWith('+') ? 'text-red-600' : 'text-green-600'}`}>{varianceText}</span>
                        </div>
                      ) : (
                        <div className="text-sm bg-gray-100 p-3 rounded-lg font-medium border border-gray-200 text-gray-400 text-center border-dashed">
                          Enter actual waste to view variance
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 italic bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-2 items-start font-medium">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-blue-500" />
                    <span>Post-cut validation is <strong className="font-bold">excluded from prediction</strong> and does not retrain or update the prediction in this prototype.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Compact Prototype Limitations Footer */}
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm flex flex-col md:flex-row gap-6 items-start">
              <div className="flex items-center gap-2 text-orange-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
                <h4 className="font-bold uppercase tracking-wider text-sm">Prototype<br/>Limitations</h4>
              </div>
              <ul className="text-slate-300 text-xs flex flex-wrap gap-x-6 gap-y-2 list-none m-0 p-0 font-medium leading-relaxed">
                <li className="flex items-center gap-1.5 before:content-['•'] before:text-slate-500">The prediction is a fixed precomputed demo output.</li>
                <li className="flex items-center gap-1.5 before:content-['•'] before:text-slate-500">Contributor values are precomputed model attributions.</li>
                <li className="flex items-center gap-1.5 before:content-['•'] before:text-slate-500">SHAP is not calculated live.</li>
                <li className="flex items-center gap-1.5 before:content-['•'] before:text-slate-500">Candidates are precomputed demo fixtures.</li>
                <li className="flex items-center gap-1.5 before:content-['•'] before:text-slate-500">Not connected to live ERP/CAD.</li>
                <li className="flex items-center gap-1.5 before:content-['•'] before:text-slate-500">Actual waste is validation-only.</li>
                <li className="flex items-center gap-1.5 before:content-['•'] before:text-slate-500">Requires trained-model validation for prod.</li>
              </ul>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/c2')} className="text-gray-500 hover:text-gray-900 bg-gray-100 p-2 rounded-lg border border-gray-200"><ArrowLeft className="w-5 h-5" /></button>
        <PageHeader title={`Fabric Waste Prediction`} description="8-Step Precomputed Prediction Workflow" />
      </div>

      {/* Run Context Strip */}
      <div className="bg-slate-800 text-slate-200 rounded-xl p-3 flex flex-wrap gap-x-6 gap-y-2 text-sm shadow-sm border border-slate-700 items-center justify-between">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span className="flex items-center gap-2"><span className="text-slate-400">Run:</span> <span className="font-mono font-bold text-white">{runData.run_id}</span></span>
          <span className="flex items-center gap-2"><span className="text-slate-400">Batch:</span> <span className="font-mono font-bold text-white">{runData.batch_id}</span></span>
          <span className="flex items-center gap-2"><span className="text-slate-400">Order:</span> <span className="font-mono font-bold text-white">{runData.order_id}</span></span>
          <span className="flex items-center gap-2"><span className="text-slate-400">Style:</span> <span className="font-mono font-bold text-white">{runData.style_id}</span></span>
          <span className="flex items-center gap-2"><span className="text-slate-400">Marker:</span> <span className="font-mono font-bold text-white">{runData.marker_id}</span></span>
        </div>
        <div className="flex gap-2">
          <span className="bg-slate-700 text-[10px] px-2 py-1 rounded border border-slate-600 font-bold uppercase tracking-wider">DEMO_PRECOMPUTED</span>
          <span className="bg-slate-700 text-[10px] px-2 py-1 rounded border border-slate-600 font-bold uppercase tracking-wider">Fixed JSON Fixture</span>
        </div>
      </div>
      
      {/* Tabs Header */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200 hide-scrollbar">
        <div className="flex min-w-max text-sm">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < activeStep;
            const isActive = idx === activeStep;
            const isPending = idx > activeStep;
            const isBlocked = activeStep === 3 && gateResult.status === 'BLOCKED' && idx > 3;

            let bgColor = 'bg-white';
            let textColor = 'text-gray-500';
            let borderColor = 'border-b-transparent';
            let iconBg = 'bg-gray-100 text-gray-500';

            if (isActive) {
              bgColor = 'bg-blue-50';
              textColor = 'text-blue-700 font-bold';
              borderColor = 'border-b-blue-600';
              iconBg = 'bg-blue-600 text-white';
            } else if (isCompleted) {
              bgColor = 'bg-gray-50';
              textColor = 'text-gray-700';
              iconBg = 'bg-green-500 text-white';
            } else if (isBlocked) {
              textColor = 'text-gray-400 opacity-50';
              iconBg = 'bg-gray-100 text-gray-400';
            }

            return (
              <div 
                key={idx} 
                className={`flex-1 min-w-[150px] text-center p-3 border-b-2 border-r border-gray-200 last:border-r-0 transition-colors ${bgColor} ${textColor} ${borderColor}`}
              >
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${iconBg}`}>
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </span>
                  <span className="text-[11px] leading-tight max-w-[120px]">{step}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStep()}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 mt-6">
        <button onClick={handlePrev} disabled={activeStep === 0} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-50">
          Previous
        </button>
        <button onClick={handleNext} disabled={activeStep === STEPS.length - 1 || (activeStep === 3 && gateResult.status === 'BLOCKED')} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          Next Step <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
