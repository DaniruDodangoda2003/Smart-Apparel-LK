/**
 * Adapter to merge C3 summary JSON with local interaction state for the Dashboard.
 */
export const getMergedC3Summary = (summaryJson, savedActions = []) => {
  if (!summaryJson) return null;
  
  const merged = { ...summaryJson };
  
  // Count locally created open actions
  const localOpenActions = savedActions.filter(
    a => a.component_id === 'C3' && (a.status === 'OPEN' || a.status === 'ACKNOWLEDGED' || a.status === 'IN_REVIEW' || a.status === 'SCHEDULED')
  ).length;
  
  merged.local_open_maintenance_actions = localOpenActions;
  
  return merged;
};
