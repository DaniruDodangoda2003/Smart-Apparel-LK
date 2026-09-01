/**
 * Adapter to merge C4 summary JSON with local interaction state for the Dashboard.
 */
export const getMergedC4Summary = (summaryJson, savedActions = []) => {
  if (!summaryJson) return null;
  
  const merged = { ...summaryJson };
  
  // Count locally created open/active C4 actions
  const localOpenActions = savedActions.filter(
    a => a.component_id === 'C4' && (a.status === 'OPEN' || a.status === 'ACKNOWLEDGED' || a.status === 'IN_REVIEW' || a.status === 'SCHEDULED')
  ).length;
  
  merged.local_open_workforce_actions = localOpenActions;
  
  return merged;
};
