import { loadLocal } from '../storage/localStore';

/**
 * Adapter to merge C2 summary JSON with local interaction state for the Dashboard.
 */
export const getMergedC2Summary = (summaryJson) => {
  if (!summaryJson) return null;
  
  const localState = loadLocal('smartapparel.c2.state', {});
  const runState = localState['RUN-C2-0001'];
  
  const merged = { ...summaryJson };
  
  if (runState) {
    merged.selection_status = runState.selection_status || 'NOT SELECTED';
    merged.approval_status = runState.approval_status || 'NOT REQUESTED';

    if (runState.validation && runState.validation.actual_waste_percent) {
      merged.validation_status = 'COMPLETED';
    }
  } else {
    merged.selection_status = 'NOT SELECTED';
    merged.approval_status = 'NOT REQUESTED';
  }
  
  return merged;
};
