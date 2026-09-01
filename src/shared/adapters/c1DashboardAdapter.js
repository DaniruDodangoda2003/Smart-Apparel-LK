import { loadLocal } from '../storage/localStore';

/**
 * Adapter to merge C1 summary JSON with local interaction state for the Dashboard.
 */
export const getMergedC1Summary = (summaryJson) => {
  if (!summaryJson) return null;
  
  const localState = loadLocal('smartapparel.c1.state', {});
  const merged = { ...summaryJson };
  
  // Just attach local state to be displayed independently if needed by the dashboard
  merged.local_interactions = localState;
  
  return merged;
};
