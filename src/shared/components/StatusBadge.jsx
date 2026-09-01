import React from 'react';

export default function StatusBadge({ status, label }) {
  const styles = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    review: 'bg-orange-100 text-orange-800 border-orange-200',
    warning: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const currentStyle = styles[status?.toLowerCase()] || styles.default;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStyle}`}>
      {label || status}
    </span>
  );
}
