import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, trend, trendValue, icon }: StatCardProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex flex-col gap-2 relative overflow-hidden">
      <div className="flex items-center justify-between text-neutral-400">
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        {icon && <div className="text-neutral-500">{icon}</div>}
      </div>
      <div className="flex items-end gap-3 mt-1">
        <span className="text-3xl font-semibold text-neutral-100 tracking-tight">{value}</span>
        {trend && trendValue && (
          <div className={`text-xs font-medium pb-1 flex items-center gap-0.5 ${
            trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-neutral-500'
          }`}>
            {trend === 'up' && <span>↑</span>}
            {trend === 'down' && <span>↓</span>}
            {trend === 'neutral' && <span>-</span>}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}
