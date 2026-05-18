'use client';

import React from 'react';
import { Entity, mockDashboardData } from '@/data/mockDashboardData';
import { StatusBadge } from './StatusBadge';
import { ShieldCheck, ShieldAlert, Calendar, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface SafetyStatusProps {
  entityFilter: Entity;
}

const SAFETY_COLORS: Record<string, string> = {
  'Approved': '#10b981',
  'Pending': '#f59e0b',
  'Expired': '#ef4444',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-neutral-300 font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-semibold">{p.value}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

export function SafetyStatus({ entityFilter }: SafetyStatusProps) {
  const filteredSafety = mockDashboardData.safety.filter(item => 
    entityFilter === 'All' || item.entity === entityFilter
  );

  const totalSites = filteredSafety.length;
  const compliantSites = filteredSafety.filter(s => s.msraStatus === 'Approved').length;
  const pendingExpired = totalSites - compliantSites;
  const totalAlerts = filteredSafety.reduce((acc, curr) => acc + curr.alerts, 0);

  const msraData = [
    { name: 'Approved', value: filteredSafety.filter(s => s.msraStatus === 'Approved').length },
    { name: 'Pending', value: filteredSafety.filter(s => s.msraStatus === 'Pending').length },
    { name: 'Expired', value: filteredSafety.filter(s => s.msraStatus === 'Expired').length },
  ].filter(d => d.value > 0);

  const alertsBySite = filteredSafety.map(s => ({
    name: s.site.split(' ')[0],
    alerts: s.alerts
  })).sort((a, b) => b.alerts - a.alerts);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Compliant Sites', value: `${compliantSites} / ${totalSites}`, icon: <CheckCircle className="w-5 h-5" />, color: 'bg-emerald-950/30 text-emerald-500', border: 'border-emerald-900/50' },
          { label: 'Pending / Expired MSRA', value: pendingExpired, icon: <Calendar className="w-5 h-5" />, color: 'bg-amber-950/30 text-amber-500', border: 'border-amber-900/50' },
          { label: 'Open Safety Alerts', value: totalAlerts, icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-red-950/30 text-red-500', border: 'border-red-900/50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex items-center gap-4">
            <div className={`p-3 rounded-lg border ${kpi.color} ${kpi.border}`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-semibold text-neutral-100">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-4">MSRA Compliance Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={msraData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {msraData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SAFETY_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-4">Active Alerts by Site</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={alertsBySite}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 10 }} />
              <YAxis tick={{ fill: '#737373', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="alerts" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="text-sm font-medium text-neutral-200">Site Safety & MSRA Detailed Tracking</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-400 bg-neutral-950/50 uppercase border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">Site Location</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">MSRA Status</th>
                <th className="px-4 py-3 font-medium">Last Inspection</th>
                <th className="px-4 py-3 font-medium text-center">Active Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {filteredSafety.length > 0 ? (
                filteredSafety.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-200">{item.site}</td>
                    <td className="px-4 py-3 text-neutral-400">{item.entity}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={item.msraStatus} /></td>
                    <td className="px-4 py-3 font-mono text-neutral-400">{item.lastCheck}</td>
                    <td className="px-4 py-3 text-center">
                      {item.alerts > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-950/50 text-red-400 border border-red-900/50 text-xs font-bold">
                          {item.alerts}
                        </span>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No safety records found for the selected entity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
