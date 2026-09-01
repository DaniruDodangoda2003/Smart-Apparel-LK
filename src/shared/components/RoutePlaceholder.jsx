import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import DemoBadge from './DemoBadge';

export default function RoutePlaceholder({ pageName }) {
  const location = useLocation();
  const { selectedFactoryId, selectedShiftId, outputMode } = useAppContext();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
        <Construction className="w-8 h-8" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{pageName}</h2>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md w-full shadow-sm mb-6">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500 font-medium">Route Path</span>
            <code className="text-gray-900 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{location.pathname}</code>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500 font-medium">Current Factory</span>
            <span className="text-gray-900 font-medium">{selectedFactoryId}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500 font-medium">Current Shift</span>
            <span className="text-gray-900 font-medium">{selectedShiftId}</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-gray-500 font-medium">Output Mode</span>
            <DemoBadge mode={outputMode} />
          </div>
        </div>
      </div>

      <div className="bg-orange-50 text-orange-800 border border-orange-200 px-4 py-3 rounded-lg flex items-center gap-2">
        <span className="font-semibold">Notice:</span> Implementation pending for this domain component.
      </div>
    </div>
  );
}
