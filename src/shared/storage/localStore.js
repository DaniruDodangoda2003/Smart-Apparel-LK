/**
 * Safe local storage wrappers for offline persistence.
 */

export const STORAGE_KEYS = {
  SETTINGS: 'smartapparel.settings',
  ALERTS: 'smartapparel.alerts',
  ACTIONS: 'smartapparel.actions',
  C1_STATE: 'smartapparel.c1.state',
  C2_STATE: 'smartapparel.c2.state',
  C3_STATE: 'smartapparel.c3.state',
  C4_STATE: 'smartapparel.c4.state'
};

export const loadLocal = (key, fallback = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Error reading localStorage for key "${key}":`, error);
    return fallback;
  }
};

export const saveLocal = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Error saving to localStorage for key "${key}":`, error);
  }
};

export const removeLocal = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Error removing localStorage for key "${key}":`, error);
  }
};

export const resetDemoState = () => {
  Object.values(STORAGE_KEYS).forEach(key => removeLocal(key));
  // Force a reload to pick up fresh JSON seeds
  window.location.reload();
};
