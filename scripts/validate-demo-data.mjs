import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const demoDataDir = path.join(rootDir, 'public', 'demo-data');

const requiredFiles = [
  'shared/idAliases.json',
  'shared/demoManifest.json',
  'shared/factories.json',
  'shared/lines.json',
  'shared/machines.json',
  'shared/operators.json',
  'shared/orders.json',
  'shared/styles.json',
  'shared/batches.json',
  'shared/rolls.json',
  'shared/markers.json',
  'shared/lays.json',
  'shared/seedAlerts.json',
  'c1/summary.json',
  'c1/inspections.json',
  'c1/model_recommendations.json',
  'c1/detections.json',
  'c1/explanations.json',
  'c1/media_outputs.json',
  'c1/history.json',
  'c2/summary.json',
  'c2/runs.json',
  'c2/contributors.json',
  'c2/strategies.json',
  'c3/summary.json',
  'c3/predictions.json',
  'c3/maintenance_history.json',
  'c3/data_sufficiency_details.json',
  'c3/survival_outputs.json',
  'c3/explanations.json',
  'c3/limited_scenarios.json',
  'c4/summary.json',
  'c4/lines.json',
  'c4/diagnostics.json',
  'c4/skill_profiles.json',
  'c4/allocation_candidates.json',
  'c2/demo_inputs.json',
  'c2/cad_demo.json'
];

let hasErrors = false;
const error = (msg) => {
  console.error(`❌ ERROR: ${msg}`);
  hasErrors = true;
};
const success = (msg) => console.log(`✅ ${msg}`);

console.log('Validating Smart Apparel-LK Demo Data...\n');

// 1. Check required files and parsing
const data = {};
requiredFiles.forEach(relPath => {
  const fullPath = path.join(demoDataDir, relPath);
  if (!fs.existsSync(fullPath)) {
    error(`Missing file: ${relPath}`);
    return;
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    data[relPath] = JSON.parse(content);
    success(`Parsed: ${relPath}`);
  } catch (e) {
    error(`Failed to parse JSON: ${relPath} - ${e.message}`);
  }
});

if (hasErrors) {
  console.error('\nValidation aborted due to parsing errors.');
  process.exit(1);
}

// Validation helpers
const validateId = (id, pattern, context) => {
  if (!id) {
    error(`Missing ID in ${context}`);
    return false;
  }
  if (!pattern.test(id)) {
    error(`Invalid canonical ID format: ${id} in ${context}`);
    return false;
  }
  return true;
};

const patterns = {
  factory: /^FAC-\d{3}$/,
  line: /^LINE-\d{2}$/,
  machine: /^MAC-\d{4}$/,
  batch: /^BAT-\d{5}$/,
  order: /^ORD-\d{5}$/,
  style: /^STY-\d{5}$/,
  marker: /^MRK-\d{5}$/,
};

// 2. Extract known canonical IDs
const knownFactories = new Set((data['shared/factories.json'] || []).map(f => f.factory_id));
const knownLines = new Set((data['shared/lines.json'] || []).map(l => l.line_id));
const knownMachines = new Set((data['shared/machines.json'] || []).map(m => m.machine_id));
const knownBatches = new Set((data['shared/batches.json'] || []).map(b => b.batch_id));
const knownOrders = new Set((data['shared/orders.json'] || []).map(o => o.order_id));
const knownStyles = new Set((data['shared/styles.json'] || []).map(s => s.style_id));
const knownMarkers = new Set((data['shared/markers.json'] || []).map(m => m.marker_id));

// Validate factories
data['shared/factories.json'].forEach((f, i) => validateId(f.factory_id, patterns.factory, `factories[${i}]`));

// Validate lines
data['shared/lines.json'].forEach((l, i) => {
  validateId(l.line_id, patterns.line, `lines[${i}]`);
  if (!knownFactories.has(l.factory_id)) error(`Invalid factory_id ${l.factory_id} in lines[${i}]`);
});

// Validate machines
data['shared/machines.json'].forEach((m, i) => {
  validateId(m.machine_id, patterns.machine, `machines[${i}]`);
  if (!knownFactories.has(m.factory_id)) error(`Invalid factory_id ${m.factory_id} in machines[${i}]`);
  if (!knownLines.has(m.line_id)) error(`Invalid line_id ${m.line_id} in machines[${i}]`);
});

const knownInspections = new Set((data['c1/inspections.json'] || []).map(i => i.inspection_id));

// Validate C1 Model Recommendations
(data['c1/model_recommendations.json'] || []).forEach((rec, i) => {
  if (rec.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c1/model_recommendations[${i}]`);
  if (rec.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c1/model_recommendations[${i}]`);
  if (!knownInspections.has(rec.inspection_id)) error(`Invalid inspection_id ${rec.inspection_id} in c1/model_recommendations[${i}]`);
});

// Validate C1 Detections
(data['c1/detections.json'] || []).forEach((det, i) => {
  if (det.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c1/detections[${i}]`);
  if (det.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c1/detections[${i}]`);
  if (!knownInspections.has(det.inspection_id)) error(`Invalid inspection_id ${det.inspection_id} in c1/detections[${i}]`);
});

// Validate C1 Explanations
(data['c1/explanations.json'] || []).forEach((exp, i) => {
  if (exp.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c1/explanations[${i}]`);
  if (exp.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c1/explanations[${i}]`);
  if (!knownInspections.has(exp.inspection_id)) error(`Invalid inspection_id ${exp.inspection_id} in c1/explanations[${i}]`);
});

// Validate C1 Media Outputs
(data['c1/media_outputs.json'] || []).forEach((mo, i) => {
  if (mo.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c1/media_outputs[${i}]`);
  if (mo.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c1/media_outputs[${i}]`);
  if (!knownInspections.has(mo.inspection_id)) error(`Invalid inspection_id ${mo.inspection_id} in c1/media_outputs[${i}]`);
});

// Validate C1 History
(data['c1/history.json'] || []).forEach((hist, i) => {
  if (hist.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c1/history[${i}]`);
  if (hist.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c1/history[${i}]`);
  if (!knownInspections.has(hist.inspection_id)) error(`Invalid inspection_id ${hist.inspection_id} in c1/history[${i}]`);
});

// Validate C2 Runs
const knownRuns = new Set();
data['c2/runs.json'].forEach((run, i) => {
  if (run.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in C2 runs[${i}]`);
  if (!knownFactories.has(run.factory_id)) error(`Invalid factory_id ${run.factory_id} in C2 runs[${i}]`);
  if (!knownBatches.has(run.batch_id)) error(`Invalid batch_id ${run.batch_id} in C2 runs[${i}]`);
  if (!knownOrders.has(run.order_id)) error(`Invalid order_id ${run.order_id} in C2 runs[${i}]`);
  if (!knownStyles.has(run.style_id)) error(`Invalid style_id ${run.style_id} in C2 runs[${i}]`);
  if (run.issued_fabric_weight_kg !== undefined) {
    if (typeof run.issued_fabric_weight_kg !== 'number' || run.issued_fabric_weight_kg <= 0) error(`Invalid issued_fabric_weight_kg in C2 runs[${i}]`);
  }
  if (run.predicted_realised_waste_pct !== undefined) {
    if (typeof run.predicted_realised_waste_pct !== 'number' || run.predicted_realised_waste_pct < 0 || run.predicted_realised_waste_pct > 100) error(`Invalid predicted_realised_waste_pct in C2 runs[${i}]`);
  }
  if (run.estimated_waste_weight_kg !== undefined) {
    if (typeof run.estimated_waste_weight_kg !== 'number' || run.estimated_waste_weight_kg < 0) error(`Invalid estimated_waste_weight_kg in C2 runs[${i}]`);
  }
  if (run.fabric_cost_basis_lkr_per_kg !== undefined) {
    if (typeof run.fabric_cost_basis_lkr_per_kg !== 'number' || run.fabric_cost_basis_lkr_per_kg < 0) error(`Invalid fabric_cost_basis_lkr_per_kg in C2 runs[${i}]`);
  }
  if (run.estimated_waste_value_lkr !== undefined) {
    if (typeof run.estimated_waste_value_lkr !== 'number' || run.estimated_waste_value_lkr < 0) error(`Invalid estimated_waste_value_lkr in C2 runs[${i}]`);
  }
  if (run.data_classification !== undefined) {
    if (run.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in C2 runs[${i}]`);
  }
  
  knownRuns.add(run.run_id);
});

// Validate C2 Contributors
const knownContributors = new Set();
data['c2/contributors.json'].forEach((contributor, i) => {
  if (!knownRuns.has(contributor.run_id)) error(`Invalid run_id ${contributor.run_id} in C2 contributors[${i}]`);
  if (knownContributors.has(contributor.contributor_id)) error(`Duplicate contributor_id ${contributor.contributor_id} in C2 contributors[${i}]`);
  if (contributor.contribution_direction !== 'INCREASE' && contributor.contribution_direction !== 'DECREASE') {
    error(`Invalid contribution_direction ${contributor.contribution_direction} in C2 contributors[${i}]`);
  }
  knownContributors.add(contributor.contributor_id);
});

// Validate C2 Strategies
const knownStrategies = new Set();
data['c2/strategies.json'].forEach((strategy, i) => {
  if (strategy.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in C2 strategies[${i}]`);
  if (!knownRuns.has(strategy.run_id)) error(`Invalid run_id ${strategy.run_id} in C2 strategies[${i}]`);
  if (knownStrategies.has(strategy.strategy_id)) error(`Duplicate strategy_id ${strategy.strategy_id} in C2 strategies[${i}]`);
  knownStrategies.add(strategy.strategy_id);
});

// Validate C2 Demo Inputs
if (data['c2/demo_inputs.json']) {
  const di = data['c2/demo_inputs.json'];
  if (di.input_mode !== 'DEMO_SAMPLE') error(`Invalid input_mode in C2 demo_inputs`);
  if (di.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in C2 demo_inputs`);
  if (di.used_for_prediction !== false) error(`used_for_prediction must be false in C2 demo_inputs`);
  if (di.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in C2 demo_inputs`);
  
  if (!di.erp || typeof di.erp.draft_order_quantity !== 'number' || di.erp.draft_order_quantity <= 0) error(`Invalid draft_order_quantity in C2 demo_inputs`);
  if (typeof di.erp.gsm !== 'number' || di.erp.gsm <= 0) error(`Invalid gsm in C2 demo_inputs`);
  
  if (!di.pre_cut || typeof di.pre_cut.number_of_plies !== 'number' || di.pre_cut.number_of_plies <= 0) error(`Invalid number_of_plies in C2 demo_inputs`);
  if (typeof di.pre_cut.spread_length !== 'number' || di.pre_cut.spread_length <= 0) error(`Invalid spread_length in C2 demo_inputs`);
  if (typeof di.pre_cut.defects_per_lay !== 'number' || di.pre_cut.defects_per_lay < 0) error(`Invalid defects_per_lay in C2 demo_inputs`);
  if (typeof di.pre_cut.end_allowance !== 'number' || di.pre_cut.end_allowance < 0) error(`Invalid end_allowance in C2 demo_inputs`);
  if (typeof di.pre_cut.machine_width !== 'number' || di.pre_cut.machine_width <= 0) error(`Invalid machine_width in C2 demo_inputs`);
  if (typeof di.pre_cut.cut_table_width !== 'number' || di.pre_cut.cut_table_width <= 0) error(`Invalid cut_table_width in C2 demo_inputs`);
  if (typeof di.pre_cut.lay_height_limit !== 'number' || di.pre_cut.lay_height_limit <= 0) error(`Invalid lay_height_limit in C2 demo_inputs`);
  if (typeof di.pre_cut.review_threshold !== 'number' || di.pre_cut.review_threshold <= 0 || di.pre_cut.review_threshold >= 100) error(`Invalid review_threshold in C2 demo_inputs`);
  if (di.pre_cut.shift !== 'SHIFT-A') error(`Invalid shift in C2 demo_inputs`);
}

// Validate C2 CAD Demo
if (data['c2/cad_demo.json']) {
  const cd = data['c2/cad_demo.json'];
  if (cd.run_id !== 'RUN-C2-0001') error(`Invalid run_id in C2 cad_demo`);
  if (!knownMarkers.has(cd.official_marker_id)) error(`Invalid official_marker_id in C2 cad_demo`);
  if (cd.input_mode !== 'DEMO_SAMPLE') error(`Invalid input_mode in C2 cad_demo`);
  if (cd.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in C2 cad_demo`);
  if (cd.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in C2 cad_demo`);
  if (cd.used_for_prediction !== false) error(`used_for_prediction must be false in C2 cad_demo`);
  
  if (!cd.cad || typeof cd.cad.marker_width !== 'number' || cd.cad.marker_width <= 0) error(`Invalid marker_width in C2 cad_demo`);
  if (typeof cd.cad.marker_length !== 'number' || cd.cad.marker_length <= 0) error(`Invalid marker_length in C2 cad_demo`);
  if (typeof cd.cad.pattern_piece_count !== 'number' || cd.cad.pattern_piece_count <= 0) error(`Invalid pattern_piece_count in C2 cad_demo`);
  if (typeof cd.cad.total_piece_area !== 'number' || cd.cad.total_piece_area <= 0) error(`Invalid total_piece_area in C2 cad_demo`);
  if (typeof cd.cad.marker_efficiency !== 'number' || cd.cad.marker_efficiency <= 0 || cd.cad.marker_efficiency > 100) error(`Invalid marker_efficiency in C2 cad_demo`);
  
  const validParserStatuses = ['DEMO_FIXTURE_LOADED', 'PREVIEW_READY', 'ACCEPTED'];
  if (!validParserStatuses.includes(cd.cad.parser_status)) error(`Invalid parser_status in C2 cad_demo`);
  
  if (!Array.isArray(cd.cad.pattern_piece_summary) || cd.cad.pattern_piece_summary.length === 0) error(`Invalid pattern_piece_summary in C2 cad_demo`);
}


// Validate C3 predictions
data['c3/predictions.json'].forEach((pred, i) => {
  if (pred.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in C3 predictions[${i}]`);
  if (!knownFactories.has(pred.factory_id)) error(`Invalid factory_id ${pred.factory_id} in C3 predictions[${i}]`);
  if (!knownLines.has(pred.line_id)) error(`Invalid line_id ${pred.line_id} in C3 predictions[${i}]`);
  if (!knownMachines.has(pred.machine_id)) error(`Invalid machine_id ${pred.machine_id} in C3 predictions[${i}]`);
});

// Validate C3 Maintenance History
(data['c3/maintenance_history.json'] || []).forEach((hist, i) => {
  if (hist.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c3/maintenance_history[${i}]`);
  if (hist.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c3/maintenance_history[${i}]`);
  if (!knownMachines.has(hist.machine_id)) error(`Invalid machine_id ${hist.machine_id} in c3/maintenance_history[${i}]`);
});

// Validate C3 Data Sufficiency Details
(data['c3/data_sufficiency_details.json'] || []).forEach((ds, i) => {
  if (ds.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c3/data_sufficiency_details[${i}]`);
  if (ds.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c3/data_sufficiency_details[${i}]`);
  if (!knownMachines.has(ds.machine_id)) error(`Invalid machine_id ${ds.machine_id} in c3/data_sufficiency_details[${i}]`);
  if (!['GOOD', 'LIMITED'].includes(ds.data_sufficiency_status)) error(`Invalid status ${ds.data_sufficiency_status} in c3/data_sufficiency_details[${i}]`);
  ['fault_field_availability', 'repair_duration_availability', 'downtime_availability'].forEach(field => {
    if (typeof ds[field] !== 'number' || ds[field] < 0 || ds[field] > 1) error(`Invalid ${field} in c3/data_sufficiency_details[${i}]`);
  });
});

// Validate C3 Survival Outputs
(data['c3/survival_outputs.json'] || []).forEach((surv, i) => {
  if (surv.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c3/survival_outputs[${i}]`);
  if (surv.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c3/survival_outputs[${i}]`);
  if (!knownMachines.has(surv.machine_id)) error(`Invalid machine_id ${surv.machine_id} in c3/survival_outputs[${i}]`);
  let lastHorizon = 0;
  const horizons = new Set();
  (surv.points || []).forEach((p, j) => {
    if (typeof p.horizon_days !== 'number' || p.horizon_days <= lastHorizon || horizons.has(p.horizon_days)) {
      error(`Unordered or duplicate horizon_days ${p.horizon_days} in c3/survival_outputs[${i}].points[${j}]`);
    }
    horizons.add(p.horizon_days);
    lastHorizon = p.horizon_days;
    if (typeof p.failure_free_probability !== 'number' || p.failure_free_probability < 0 || p.failure_free_probability > 1) {
      error(`Invalid failure_free_probability in c3/survival_outputs[${i}].points[${j}]`);
    }
  });
});

// Validate C3 Explanations (SHAP)
(data['c3/explanations.json'] || []).forEach((exp, i) => {
  if (exp.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c3/explanations[${i}]`);
  if (exp.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c3/explanations[${i}]`);
  if (!knownMachines.has(exp.machine_id)) error(`Invalid machine_id ${exp.machine_id} in c3/explanations[${i}]`);
  const features = new Set();
  (exp.drivers || []).forEach((d, j) => {
    if (features.has(d.feature)) error(`Duplicate feature ${d.feature} in c3/explanations[${i}].drivers[${j}]`);
    features.add(d.feature);
    if (!Number.isFinite(d.shap_value)) error(`Non-finite SHAP value in c3/explanations[${i}].drivers[${j}]`);
    if (!['INCREASES_RISK', 'DECREASES_RISK'].includes(d.direction)) error(`Invalid direction in c3/explanations[${i}].drivers[${j}]`);
  });
});

// Validate C3 Limited Scenarios
(data['c3/limited_scenarios.json'] || []).forEach((sc, i) => {
  if (sc.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c3/limited_scenarios[${i}]`);
  if (sc.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c3/limited_scenarios[${i}]`);
  if (!knownMachines.has(sc.machine_id)) error(`Invalid machine_id ${sc.machine_id} in c3/limited_scenarios[${i}]`);
});

// Validate Alerts
data['shared/seedAlerts.json'].forEach((alert, i) => {
  if (!alert.action_route || alert.action_route.trim() === '') {
    error(`Empty action_route in seedAlerts[${i}]`);
  }
});

const knownOperators = new Set((data['shared/operators.json'] || []).map(o => o.operator_id));

// Validate C4 Diagnostics
(data['c4/diagnostics.json'] || []).forEach((diag, i) => {
  if (diag.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c4/diagnostics[${i}]`);
  if (diag.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c4/diagnostics[${i}]`);
  if (!knownLines.has(diag.line_id)) error(`Invalid line_id ${diag.line_id} in c4/diagnostics[${i}]`);
});

// Validate C4 Skill Profiles
(data['c4/skill_profiles.json'] || []).forEach((prof, i) => {
  if (prof.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c4/skill_profiles[${i}]`);
  if (prof.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c4/skill_profiles[${i}]`);
  if (!knownOperators.has(prof.operator_id)) error(`Invalid operator_id ${prof.operator_id} in c4/skill_profiles[${i}]`);
});

// Validate C4 Allocation Candidates
(data['c4/allocation_candidates.json'] || []).forEach((cand, i) => {
  if (cand.output_mode !== 'DEMO_PRECOMPUTED') error(`Invalid output_mode in c4/allocation_candidates[${i}]`);
  if (cand.data_classification !== 'SYNTHETIC_DEMONSTRATION') error(`Invalid data_classification in c4/allocation_candidates[${i}]`);
  if (!knownLines.has(cand.line_id)) error(`Invalid line_id ${cand.line_id} in c4/allocation_candidates[${i}]`);
  
  if (typeof cand.simulated_predicted_efficiency !== 'number' || cand.simulated_predicted_efficiency < 0 || cand.simulated_predicted_efficiency > 100) {
    error(`Invalid simulated_predicted_efficiency in c4/allocation_candidates[${i}]`);
  }
  
  (cand.operator_ids || []).forEach(opId => {
    if (!knownOperators.has(opId)) error(`Invalid operator_id ${opId} in c4/allocation_candidates[${i}]`);
  });
});

console.log('\n--- Validation Result ---');
if (hasErrors) {
  console.error('❌ Data validation failed. See errors above.');
  process.exit(1);
} else {
  console.log('✅ All data validation checks passed successfully!');
  process.exit(0);
}
