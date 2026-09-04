import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import HealthCheck from './pages/HealthCheck';
import AppLayout from './layouts/AppLayout';
import RoutePlaceholder from './shared/components/RoutePlaceholder';
import Dashboard from './pages/Dashboard';
import AlertsActions from './pages/AlertsActions';
import C2BatchWorkspace from './components-domain/c2/C2BatchWorkspace';
import C2RunReview from './components-domain/c2/C2RunReview';
import C2Analytics from './components-domain/c2/C2Analytics';
import C1QualityWorkspace from './components-domain/c1/C1QualityWorkspace';
import C1Analytics from './components-domain/c1/C1Analytics';
import C1InspectionDetail from './components-domain/c1/C1InspectionDetail';
import C1ImageInspection from './components-domain/c1/C1ImageInspection';
import C1VideoInspection from './components-domain/c1/C1VideoInspection';
import C1History from './components-domain/c1/C1History';
import C3FleetOverview from './components-domain/c3/C3FleetOverview';
import C3MachineAnalysis from './components-domain/c3/C3MachineAnalysis';
import C3MaintenanceActions from './components-domain/c3/C3MaintenanceActions';
import C4WorkforceOverview from './components-domain/c4/C4WorkforceOverview';
import C4RunWorkflow from './components-domain/c4/C4RunWorkflow';
import C4ModelValidation from './components-domain/c4/C4ModelValidation';

export const router = createBrowserRouter([
  {
    path: '/health-check',
    element: <HealthCheck />
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />
      },
      // C1: Fabric Quality
      {
        path: 'c1',
        element: <C1QualityWorkspace />
      },
      {
        path: 'c1/analytics',
        element: <C1Analytics />
      },
      {
        path: 'c1/inspect-image',
        element: <C1ImageInspection />
      },
      {
        path: 'c1/inspect-video',
        element: <C1VideoInspection />
      },
      {
        path: 'c1/history',
        element: <C1History />
      },
      {
        path: 'c1/event/:eventId',
        element: <C1InspectionDetail />
      },
      // C2: Fabric Waste
      {
        path: 'c2',
        element: <C2BatchWorkspace />
      },
      {
        path: 'c2/analytics',
        element: <C2Analytics />
      },
      {
        path: 'c2/run/:runId',
        element: <C2RunReview />
      },
      // C3: Predictive Maintenance
      {
        path: 'c3',
        element: <C3FleetOverview />
      },
      {
        path: 'c3/machine/:machineId',
        element: <C3MachineAnalysis />
      },
      {
        path: 'c3/machine/:machineId/explain',
        element: <RoutePlaceholder pageName="Machine AI Explanation" />
      },
      {
        path: 'c3/actions',
        element: <C3MaintenanceActions />
      },
      // C4: Workforce
      {
        path: 'c4',
        element: <C4WorkforceOverview />
      },
      {
        path: 'c4/run/:runId',
        element: <C4RunWorkflow />
      },
      {
        path: 'c4/model-validation',
        element: <C4ModelValidation />
      },
      // Shared
      {
        path: 'alerts',
        element: <AlertsActions />
      },
      {
        path: 'reports',
        element: <RoutePlaceholder pageName="System Reports" />
      }
    ]
  }
]);
