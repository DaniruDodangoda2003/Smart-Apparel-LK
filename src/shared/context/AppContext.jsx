import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadLocal, saveLocal, STORAGE_KEYS } from '../storage/localStore';
import { loadDemoJson } from '../data/loaders';
import { getMergedAlerts, getOpenAlertCount, updateAlertStatusInStorage } from '../alerts/alertService';

// Define output modes
export const OUTPUT_MODES = {
  PROTOTYPE_UI: 'PROTOTYPE_UI',
  DEMO_PRECOMPUTED: 'DEMO_PRECOMPUTED',
  LIVE_VALIDATED: 'LIVE_VALIDATED'
};

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Load settings from local storage or use defaults
  const initialSettings = loadLocal(STORAGE_KEYS.SETTINGS, {
    outputMode: OUTPUT_MODES.DEMO_PRECOMPUTED,
    selectedFactoryId: 'FAC-001',
    selectedShiftId: 'SHIFT-A',
    demoDate: '2026-09-01',
    userRole: 'Cutting Room Manager'
  });

  const [outputMode, setOutputModeState] = useState(initialSettings.outputMode);
  const [selectedFactoryId, setSelectedFactoryIdState] = useState(initialSettings.selectedFactoryId);
  const [selectedShiftId, setSelectedShiftIdState] = useState(initialSettings.selectedShiftId);
  const [demoDate, setDemoDateState] = useState(initialSettings.demoDate);
  const [userRole, setUserRoleState] = useState(initialSettings.userRole);

  const [globalAlerts, setGlobalAlerts] = useState([]);
  const [openAlertCount, setOpenAlertCount] = useState(0);
  
  const [savedActions, setSavedActionsState] = useState(() => loadLocal(STORAGE_KEYS.ACTIONS, []));

  // Helper to save settings when they change
  const saveSettings = (newSettings) => {
    const currentSettings = {
      outputMode,
      selectedFactoryId,
      selectedShiftId,
      demoDate,
      userRole,
      ...newSettings
    };
    saveLocal(STORAGE_KEYS.SETTINGS, currentSettings);
  };

  const setOutputMode = (val) => { setOutputModeState(val); saveSettings({ outputMode: val }); };
  const setSelectedFactoryId = (val) => { setSelectedFactoryIdState(val); saveSettings({ selectedFactoryId: val }); };
  const setSelectedShiftId = (val) => { setSelectedShiftIdState(val); saveSettings({ selectedShiftId: val }); };
  const setDemoDate = (val) => { setDemoDateState(val); saveSettings({ demoDate: val }); };
  const setUserRole = (val) => { setUserRoleState(val); saveSettings({ userRole: val }); };

  const setSavedActions = (actions) => {
    setSavedActionsState(actions);
    saveLocal(STORAGE_KEYS.ACTIONS, actions);
  };

  // Load and merge alerts on mount
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const seedAlerts = await loadDemoJson('shared/seedAlerts.json');
        const merged = getMergedAlerts(seedAlerts);
        setGlobalAlerts(merged);
        setOpenAlertCount(getOpenAlertCount(merged));
      } catch (err) {
        console.error('Failed to load seed alerts:', err);
      }
    };
    fetchAlerts();
  }, []);

  // Update alert status dynamically
  const updateAlert = (alertId, newStatus) => {
    updateAlertStatusInStorage(alertId, newStatus);
    // Re-merge locally
    const updatedAlerts = globalAlerts.map(a => 
      a.alert_id === alertId ? { ...a, status: newStatus } : a
    );
    setGlobalAlerts(updatedAlerts);
    setOpenAlertCount(getOpenAlertCount(updatedAlerts));
  };

  const resetDemoState = () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    window.location.reload();
  };

  const value = {
    outputMode,
    setOutputMode,
    selectedFactoryId,
    setSelectedFactoryId,
    selectedShiftId,
    setSelectedShiftId,
    demoDate,
    setDemoDate,
    userRole,
    setUserRole,
    globalAlerts,
    openAlertCount,
    updateAlert,
    savedActions,
    setSavedActions,
    resetDemoState,
    OUTPUT_MODES
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
