import React from 'react';
import { useAppContext } from '../shared/context/AppContext';

export default function HealthCheck() {
  const { outputMode } = useAppContext();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Smart Apparel-LK
        </h1>
        <p className="text-gray-600 mb-6">
          Prototype application is running successfully.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-blue-800">
            Current Output Mode:
          </p>
          <code className="text-blue-900 font-mono text-sm block mt-1">
            {outputMode}
          </code>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
          <div className="border rounded p-3">
            <span className="block font-semibold text-gray-700">React</span>
            Working
          </div>
          <div className="border rounded p-3">
            <span className="block font-semibold text-gray-700">Tailwind</span>
            Working
          </div>
          <div className="border rounded p-3">
            <span className="block font-semibold text-gray-700">Router</span>
            Working
          </div>
          <div className="border rounded p-3">
            <span className="block font-semibold text-gray-700">Storage</span>
            Offline Mode
          </div>
        </div>
      </div>
    </div>
  );
}
