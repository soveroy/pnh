import React from 'react';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  let colorClasses = 'bg-neutral-800 text-neutral-300 border-neutral-700';

  if (!type) {
    // Auto-determine type based on text
    const text = status.toLowerCase();
    if (text.includes('active') || text.includes('approved') || text.includes('matched') || text.includes('success')) {
      type = 'success';
    } else if (text.includes('delayed') || text.includes('partial') || text.includes('pending') || text.includes('auto-reconciled')) {
      type = 'warning';
    } else if (text.includes('hold') || text.includes('flagged') || text.includes('expired') || text.includes('unmatched') || text.includes('error')) {
      type = 'error';
    } else {
      type = 'neutral';
    }
  }

  switch (type) {
    case 'success':
      colorClasses = 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50';
      break;
    case 'warning':
      colorClasses = 'bg-amber-950/40 text-amber-400 border-amber-900/50';
      break;
    case 'error':
      colorClasses = 'bg-red-950/40 text-red-400 border-red-900/50';
      break;
    case 'info':
      colorClasses = 'bg-blue-950/40 text-blue-400 border-blue-900/50';
      break;
    case 'neutral':
      colorClasses = 'bg-neutral-800 text-neutral-300 border-neutral-700';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-widest ${colorClasses}`}>
      {status}
    </span>
  );
}
