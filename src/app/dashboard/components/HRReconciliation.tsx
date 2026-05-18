'use client';

import React, { useState } from 'react';
import { Entity, mockDashboardData } from '@/data/mockDashboardData';
import { StatusBadge } from './StatusBadge';
import { Search, ShieldAlert, Users, CheckCircle, AlertTriangle, FileCheck } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface HRReconciliationProps {
  entityFilter: Entity;
}

const STATUS_COLORS: Record<string, string> = {
  'Approved': '#10b981',
  'Auto-reconciled': '#f59e0b',
  'Flagged': '#ef4444',
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

export function HRReconciliation({ entityFilter }: HRReconciliationProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = mockDashboardData.hrRecords.filter(record => {
    const matchesEntity = entityFilter === 'All' || record.entity === entityFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      record.name.toLowerCase().includes(searchLower) || 
      record.role.toLowerCase().includes(searchLower) ||
      record.certs.some(cert => cert.toLowerCase().includes(searchLower));
    
    return matchesEntity && matchesSearch;
  });

  const statusData = [
    { name: 'Approved', value: filteredRecords.filter(r => r.status === 'Approved').length },
    { name: 'Auto-reconciled', value: filteredRecords.filter(r => r.status === 'Auto-reconciled').length },
    { name: 'Flagged', value: filteredRecords.filter(r => r.status === 'Flagged').length },
  ].filter(d => d.value > 0);

  const varianceData = filteredRecords.map(r => ({
    name: r.name.split(' ')[0],
    variance: parseFloat(r.otVariance.replace(/[^+-\d.]/g, '')) || 0,
    status: r.status
  })).sort((a, b) => b.variance - a.variance);

  const getRowClass = (status: string) => {
    if (status === 'Approved') return 'hover:bg-neutral-800/30';
    if (status === 'Auto-reconciled') return 'bg-amber-950/10 hover:bg-amber-950/20';
    if (status === 'Flagged') return 'bg-red-950/10 hover:bg-red-950/20 border-l-2 border-l-red-500';
    return '';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Staff', value: filteredRecords.length, icon: <Users className="w-4 h-4" />, color: 'text-blue-400' },
          { label: 'Approved', value: filteredRecords.filter(r => r.status === 'Approved').length, icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400' },
          { label: 'Auto-reconciled', value: filteredRecords.filter(r => r.status === 'Auto-reconciled').length, icon: <FileCheck className="w-4 h-4" />, color: 'text-amber-400' },
          { label: 'Manual Review', value: filteredRecords.filter(r => r.status === 'Flagged').length, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-1">
            <div className={`flex items-center gap-1.5 ${kpi.color}`}>
              {kpi.icon}
              <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">{kpi.label}</span>
            </div>
            <span className="text-2xl font-bold text-neutral-100 tracking-tight">{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-4">Reconciliation Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-4">OT Variance (Hrs)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={varianceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 10 }} />
              <YAxis tick={{ fill: '#737373', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="variance" radius={[4, 4, 0, 0]}>
                {varianceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.variance > 0 ? '#ef4444' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-neutral-200">Validation Dashboard</h3>
            <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-[10px] rounded uppercase">DST & Minor OT</span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Search certs, roles, names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-sm rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 text-neutral-200 placeholder:text-neutral-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-400 bg-neutral-950/50 uppercase border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">Emp ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Certifications</th>
                <th className="px-4 py-3 font-medium">OT Variance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className={`${getRowClass(record.status)} transition-colors`}>
                    <td className="px-4 py-3 font-mono text-neutral-400 whitespace-nowrap">{record.id}</td>
                    <td className="px-4 py-3 font-medium text-neutral-200 whitespace-nowrap">{record.name}</td>
                    <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">{record.role}</td>
                    <td className="px-4 py-3 text-neutral-400">{record.entity}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {record.certs.map(cert => (
                          <span key={cert} className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 text-[10px] rounded border border-neutral-700">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-300">{record.otVariance}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={record.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {record.status === 'Flagged' ? (
                        <button className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-800/50 hover:bg-red-900/50 transition-colors flex items-center gap-1 ml-auto">
                          <ShieldAlert className="w-3 h-3" />
                          Review
                        </button>
                      ) : (
                        <button className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                    No records found matching the filters.
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
