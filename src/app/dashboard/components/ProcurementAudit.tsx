'use client';

import React from 'react';
import { Entity, mockDashboardData } from '@/data/mockDashboardData';
import { StatusBadge } from './StatusBadge';
import { FileText, ArrowRight, FileCheck, FileWarning, ShoppingCart, DollarSign, TrendingUp, AlertOctagon } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface ProcurementAuditProps {
  entityFilter: Entity;
}

const MATCH_COLORS: Record<string, string> = {
  'Matched': '#10b981',
  'Partial': '#f59e0b',
  'Unmatched': '#ef4444',
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

export function ProcurementAudit({ entityFilter }: ProcurementAuditProps) {
  const filteredProcurement = mockDashboardData.procurement.filter(item => 
    entityFilter === 'All' || item.entity === entityFilter
  );

  const matchData = [
    { name: 'Matched', value: filteredProcurement.filter(p => p.matchStatus === 'Matched').length },
    { name: 'Partial', value: filteredProcurement.filter(p => p.matchStatus === 'Partial').length },
    { name: 'Unmatched', value: filteredProcurement.filter(p => p.matchStatus === 'Unmatched').length },
  ].filter(d => d.value > 0);

  const spendByVendor = filteredProcurement.map(p => ({
    vendor: p.vendor,
    amount: parseFloat(p.amount.replace(/[^\d.]/g, '')) || 0,
    status: p.matchStatus
  })).sort((a, b) => b.amount - a.amount);

  const totalSpend = filteredProcurement.reduce((acc, p) => acc + (parseFloat(p.amount.replace(/[^\d.]/g, '')) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Open PRs', value: mockDashboardData.overview.openPRs, icon: <ShoppingCart className="w-4 h-4" />, color: 'text-blue-400' },
          { label: 'Total Spend', value: `$${totalSpend.toLocaleString()}`, icon: <DollarSign className="w-4 h-4" />, color: 'text-green-400' },
          { label: 'Audit Compliance', value: '84%', icon: <TrendingUp className="w-4 h-4" />, color: 'text-indigo-400' },
          { label: 'High Risk Items', value: filteredProcurement.filter(p => p.matchStatus === 'Unmatched').length, icon: <AlertOctagon className="w-4 h-4" />, color: 'text-red-400' },
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-4">3-Way Match Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={matchData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {matchData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={MATCH_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-4">Spend by Vendor ($)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spendByVendor}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="vendor" tick={{ fill: '#737373', fontSize: 10 }} />
              <YAxis tick={{ fill: '#737373', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-200">Audit Detailed View (PR → PO → Invoice)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-400 bg-neutral-950/50 uppercase border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">PR ID</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Item Description</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium text-center">Match Flow</th>
                <th className="px-4 py-3 font-medium">Match Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {filteredProcurement.length > 0 ? (
                filteredProcurement.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-neutral-300 whitespace-nowrap">{item.id}</td>
                    <td className="px-4 py-3 font-medium text-neutral-200">{item.vendor}</td>
                    <td className="px-4 py-3 text-neutral-400">{item.entity}</td>
                    <td className="px-4 py-3 text-neutral-400 max-w-xs truncate">{item.item}</td>
                    <td className="px-4 py-3 font-mono text-neutral-300">{item.amount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2 text-neutral-500">
                        <FileText className="w-4 h-4 text-neutral-400" title="Purchase Requisition" />
                        <ArrowRight className="w-3 h-3" />
                        <FileText className="w-4 h-4 text-neutral-400" title="Purchase Order" />
                        <ArrowRight className="w-3 h-3" />
                        {item.matchStatus === 'Matched' ? (
                          <FileCheck className="w-4 h-4 text-emerald-500" title="Invoice Matched" />
                        ) : item.matchStatus === 'Partial' ? (
                          <FileWarning className="w-4 h-4 text-amber-500" title="Partial Match" />
                        ) : (
                          <FileCheck className="w-4 h-4 text-red-500 border border-red-500 border-dashed rounded-sm" title="Missing/Unmatched Invoice" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={item.matchStatus} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    No procurement records found for the selected entity.
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
