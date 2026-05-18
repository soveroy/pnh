'use client';

import React, { useState } from 'react';
import { Entity, mockDashboardData } from '@/data/mockDashboardData';
import { FileText, Users, ChevronDown, ChevronUp, CalendarDays, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';

interface OperationsTrackerProps {
  entityFilter: Entity;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  Active:    { bg: 'bg-blue-900/20',   text: 'text-blue-400',   border: 'border-blue-800/50',   bar: '#3b82f6' },
  Completed: { bg: 'bg-green-900/20',  text: 'text-green-400',  border: 'border-green-800/50',  bar: '#10b981' },
  Delayed:   { bg: 'bg-red-900/20',    text: 'text-red-400',    border: 'border-red-800/50',    bar: '#ef4444' },
  'On Hold': { bg: 'bg-amber-900/20',  text: 'text-amber-400',  border: 'border-amber-800/50',  bar: '#f59e0b' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(plannedEnd: string, forecastEnd: string) {
  return new Date(forecastEnd) > new Date(plannedEnd);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GanttTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload;
    return (
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs shadow-xl max-w-xs">
        <p className="text-neutral-100 font-semibold mb-1">{d?.site}</p>
        <p className="text-neutral-400">Contract: <span className="text-neutral-200">{d?.contractRef}</span></p>
        <p className="text-neutral-400">Value: <span className="text-neutral-200">{d?.contractValue}</span></p>
        <p className="text-neutral-400">Completion: <span className="text-neutral-200">{d?.completion}%</span></p>
      </div>
    );
  }
  return null;
};

export function OperationsTracker({ entityFilter }: OperationsTrackerProps) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const filteredJobs = mockDashboardData.jobs.filter(job =>
    entityFilter === 'All' || job.entity === entityFilter
  );

  const ganttData = filteredJobs.map(j => ({
    ...j,
    label: j.site.length > 22 ? j.site.slice(0, 22) + '…' : j.site,
    barColor: STATUS_COLORS[j.status]?.bar || '#6b7280',
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Projects', value: filteredJobs.length },
          { label: 'On Schedule', value: filteredJobs.filter(j => j.status === 'Active' || j.status === 'Completed').length },
          { label: 'At Risk / Delayed', value: filteredJobs.filter(j => j.status === 'Delayed' || j.status === 'On Hold').length },
          { label: 'Total Manpower', value: filteredJobs.reduce((acc, j) => acc + j.manpower.supervisors + j.manpower.technicians + j.manpower.workers, 0) },
        ].map(s => (
          <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-bold text-neutral-100 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Gantt-Style Completion Chart */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-4">Project Completion Overview</h3>
        <ResponsiveContainer width="100%" height={Math.max(200, ganttData.length * 44)}>
          <BarChart data={ganttData} layout="vertical" barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="label" width={160} tick={{ fill: '#a3a3a3', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<GanttTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="completion" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {ganttData.map((entry) => (
                <Cell key={entry.id} fill={entry.barColor} />
              ))}
              <LabelList dataKey="completion" position="right" style={{ fill: '#a3a3a3', fontSize: 11 }} formatter={(v: number) => `${v}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Project Cards */}
      <div>
        <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-3">Project Details</h3>
        <div className="flex flex-col gap-3">
          {filteredJobs.length > 0 ? filteredJobs.map((job) => {
            const sc = STATUS_COLORS[job.status] || STATUS_COLORS['Active'];
            const overdue = isOverdue(job.plannedEnd, job.forecastEnd);
            const totalPax = job.manpower.supervisors + job.manpower.technicians + job.manpower.workers;
            const isExpanded = expandedJob === job.id;

            return (
              <div
                key={job.id}
                className={`bg-neutral-900 border ${sc.border} rounded-lg overflow-hidden transition-all`}
              >
                {/* Card Header — always visible, clickable */}
                <button
                  className="w-full p-4 flex flex-col sm:flex-row gap-4 hover:bg-neutral-800/30 transition-colors text-left"
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                >
                  {/* Left: Job info */}
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                        {job.status}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">{job.id}</span>
                      <span className="text-[10px] font-mono text-neutral-500">{job.contractRef}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-neutral-100 mt-0.5">{job.site}</h4>
                    <p className="text-xs text-neutral-400">{job.entity} · {job.contractValue}</p>
                  </div>

                  {/* Right: Key metrics */}
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center shrink-0">
                    {/* Dates */}
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <CalendarDays className="w-3 h-3" />
                        <span>Start: <span className="text-neutral-300 font-medium">{formatDate(job.startDate)}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <CalendarDays className="w-3 h-3" />
                        <span>Planned End: <span className="text-neutral-300 font-medium">{formatDate(job.plannedEnd)}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {overdue ? <AlertTriangle className="w-3 h-3 text-red-400" /> : <CalendarDays className="w-3 h-3 text-green-400" />}
                        <span className={`${overdue ? 'text-red-400' : 'text-green-400'}`}>
                          Forecast: <span className="font-medium">{formatDate(job.forecastEnd)}</span>
                          {overdue && ' ⚠ Slippage'}
                        </span>
                      </div>
                    </div>

                    {/* Manpower */}
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800/60 px-3 py-1.5 rounded-lg border border-neutral-700/40">
                      <Users className="w-3.5 h-3.5" />
                      <span><span className="text-neutral-200 font-semibold">{totalPax}</span> pax</span>
                    </div>

                    {/* Completion ring */}
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="relative w-12 h-12">
                        <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#262626" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke={sc.bar}
                            strokeWidth="3"
                            strokeDasharray={`${(job.completion / 100) * 94.2} 94.2`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-neutral-100">{job.completion}%</span>
                      </div>
                    </div>

                    {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-neutral-800 flex flex-col gap-4">
                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs text-neutral-500 mb-1 mt-3">
                        <span>Progress</span>
                        <span>{job.completion}%</span>
                      </div>
                      <div className="h-1.5 bg-neutral-800 rounded-full">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${job.completion}%`, backgroundColor: sc.bar }}
                        />
                      </div>
                    </div>

                    {/* Manpower breakdown */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { role: 'Supervisors', count: job.manpower.supervisors },
                        { role: 'Technicians', count: job.manpower.technicians },
                        { role: 'Workers', count: job.manpower.workers },
                      ].map(m => (
                        <div key={m.role} className="bg-neutral-800/50 rounded-lg p-3 text-center border border-neutral-700/30">
                          <p className="text-xl font-bold text-neutral-100">{m.count}</p>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">{m.role}</p>
                        </div>
                      ))}
                    </div>

                    {/* Site survey text */}
                    <div className="flex items-start gap-2 bg-neutral-950/50 p-3 rounded-lg border border-neutral-800/50">
                      <FileText className="w-3.5 h-3.5 text-neutral-500 mt-0.5 shrink-0" />
                      <p className="text-xs font-mono text-neutral-400 leading-relaxed">{job.surveyText}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="p-8 text-center text-neutral-500 text-sm bg-neutral-900 border border-neutral-800 rounded-lg">
              No projects found for the selected entity.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
