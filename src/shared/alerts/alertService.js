import { loadLocal, saveLocal, STORAGE_KEYS } from '../storage/localStore';

/**
 * Alert service for managing fixed JSON seed alerts and local overrides.
 */

export const getMergedAlerts = (seedAlerts) => {
  if (!seedAlerts) return [];
  
  const localOverrides = loadLocal(STORAGE_KEYS.ALERTS, {});
  
  // Merge seed data with local overrides
  return seedAlerts.map(alert => {
    const override = localOverrides[alert.alert_id];
    if (override) {
      return { ...alert, ...override };
    }
    return alert;
  });
};

export const getOpenAlertCount = (mergedAlerts) => {
  return mergedAlerts.filter(a => a.status === 'OPEN').length;
};

export const updateAlertStatusInStorage = (alertId, newStatus) => {
  const localOverrides = loadLocal(STORAGE_KEYS.ALERTS, {});
  
  localOverrides[alertId] = {
    ...localOverrides[alertId],
    status: newStatus,
    updated_at: new Date().toISOString()
  };
  
  saveLocal(STORAGE_KEYS.ALERTS, localOverrides);
  return localOverrides;
};

export const getAlertRoute = (alert) => {
  if (alert.action_route) {
    return alert.action_route;
  }
  
  // Safe fallback if action_route is missing
  switch (alert.component_id) {
    case 'C1': return '/c1';
    case 'C2': return '/c2';
    case 'C3': return '/c3';
    case 'C4': return '/c4';
    default: return '/';
  }
};
