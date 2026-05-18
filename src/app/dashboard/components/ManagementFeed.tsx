'use client';

import React from 'react';
import { Entity, mockDashboardData } from '@/data/mockDashboardData';
import { AlertCircle, AlertTriangle, Info, Activity, CheckCircle, Clock, DollarSign, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, PieChart, Pie, Legend,
} from 'recharts';

interface ManagementFeedProps {
  entityFilter: Entity;
}

const ENTITY_COLORS: Record<string, string> = {
  PNHR: '#6366f1',
  Goodman: '#10b981',
  Passion: '#f59e0b',
  'J&P': '#3b82f6',
};

const STATUS_COLORS: Record<string, string> = {
  Active: '#3b82f6',
  Completed: '#10b981',
  Delayed: '#ef4444',
  'On Hold': '#f59e0b',
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

export function ManagementFeed({ entityFilter }: ManagementFeedProps) {
  const filteredAlerts = mockDashboardData.aiAlerts.filter(alert =>
    entityFilter === 'All' || alert.message.includes(entityFilter) || alert.message.includes('sync') || alert.message.includes('auto')
  );

  const filteredEntities = entityFilter === 'All'
    ? mockDashboardData.entitiesProgress
    : mockDashboardData.entitiesProgress.filter(e => e.entity === entityFilter);

  const pieData = mockDashboardData.statusBreakdown;

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Active Jobs', value: mockDashboardData.overview.activeJobs, icon: <Activity className="w-4 h-4" />, color: 'text-blue-400' },
          { label: 'Completion Rate', value: `${mockDashboardData.overview.completionRate}%`, icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400', sub: '↑ +2.4% this week' },
          { label: 'Contract Value', value: mockDashboardData.overview.totalContractValue, icon: <DollarSign className="w-4 h-4" />, color: 'text-indigo-400' },
          { label: 'Manpower Deployed', value: mockDashboardData.overview.manpowerDeployed, icon: <Users className="w-4 h-4" />, color: 'text-amber-400' },
          { label: 'Open PRs', value: mockDashboardData.overview.openPRs, icon: <Clock className="w-4 h-4" />, color: 'text-neutral-400' },
          { label: 'Flagged HR', value: mockDashboardData.overview.flaggedHRRecords, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400', sub: '↓ -5 from yesterday' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-1.5">
            <div className={`flex items-center gap-1.5 ${kpi.color}`}>
              {kpi.icon}
              <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">{kpi.label}</span>
            </div>
            <span className="text-2xl font-bold text-neutral-100 tracking-tight">{kpi.value}</span>
            {kpi.sub && <span className={`text-[10px] font-medium ${kpi.sub.startsWith('↑') ? 'text-green-500' : 'text-red-500'}`}>{kpi.sub}</span>}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Jobs Bar Chart */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-4">Monthly Jobs Completed vs Target</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockDashboardData.monthlyCompletion} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="month" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="completed" name="Completed" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="target" name="Target" fill="#374151" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Job Status Pie */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-4">Job Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {pieData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(val) => <span style={{ color: '#a3a3a3', fontSize: 11 }}>{val}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Entity Portfolio & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Entity Radial Progress Chart */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">Portfolio Progress by Entity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadialBarChart
              cx="50%" cy="50%"
              innerRadius={20} outerRadius={90}
              barSize={12}
              data={filteredEntities.map(e => ({ ...e, name: e.entity, value: e.completion, fill: ENTITY_COLORS[e.entity] || '#6b7280' }))}
              startAngle={90} endAngle={-270}
            >
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#262626' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(val) => <span style={{ color: '#a3a3a3', fontSize: 11 }}>{val}</span>} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-2">
            {filteredEntities.map(e => (
              <div key={e.entity} className={`flex items-center justify-between text-xs ${entityFilter !== 'All' && entityFilter !== e.entity ? 'opacity-30' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ENTITY_COLORS[e.entity] || '#6b7280' }} />
                  <span className="text-neutral-300 font-medium">{e.entity}</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-500">
                  <span>{e.jobs} jobs</span>
                  <span>{e.manpower} pax</span>
                  <span className="font-mono text-neutral-300">{e.completion}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Alerts Feed */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider">AI Insights & Alerts Feed</h3>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            {filteredAlerts.length > 0 ? (
              <div className="divide-y divide-neutral-800/50">
                {filteredAlerts.map(alert => (
                  <div key={alert.id} className={`p-4 flex gap-4 hover:bg-neutral-800/30 transition-colors border-l-2 ${
                    alert.type === 'critical' ? 'border-red-500' : alert.type === 'warning' ? 'border-amber-500' : 'border-blue-500'
                  }`}>
                    <div className="mt-0.5 shrink-0">
                      {alert.type === 'critical' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      {alert.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${alert.type === 'critical' ? 'text-red-100' : 'text-neutral-200'}`}>
                          {alert.message}
                        </p>
                        <span className={`shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                          alert.type === 'critical' ? 'text-red-400 border-red-800/60 bg-red-900/20' :
                          alert.type === 'warning' ? 'text-amber-400 border-amber-800/60 bg-amber-900/20' :
                          'text-blue-400 border-blue-800/60 bg-blue-900/20'
                        }`}>{alert.type}</span>
                      </div>
                      <span className="text-xs text-neutral-500 mt-1 block">{alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-neutral-500 text-sm">
                No new alerts for the selected entity.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
