import React from 'react';
import { AlertCircle, Clock, Info } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function AlertRow({ alert, onClick }) {
  const Icon = alert.severity === 'critical' ? AlertCircle : (alert.severity === 'warning' ? Clock : Info);
  const colorClass = alert.severity === 'critical' ? 'text-red-500' : (alert.severity === 'warning' ? 'text-orange-500' : 'text-blue-500');

  return (
    <div 
      onClick={onClick}
      className={`flex items-start p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    >
      <Icon className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {alert.title}
          </p>
          <StatusBadge status={alert.status} />
        </div>
        <p className="text-sm text-gray-500 line-clamp-2">
          {alert.description}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          {alert.timestamp} • {alert.source}
        </p>
      </div>
    </div>
  );
}
