import React from 'react';
import { Beaker } from 'lucide-react';

export default function DemoBadge({ mode }) {
  if (mode !== 'DEMO_PRECOMPUTED') return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900 text-blue-50 border border-blue-700 text-xs font-semibold shadow-sm">
      <Beaker className="w-3.5 h-3.5" />
      <span>DEMO_PRECOMPUTED</span>
    </div>
  );
}
