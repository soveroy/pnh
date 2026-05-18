'use client';

import React from 'react';
import { Entity, mockDashboardData } from '@/data/mockDashboardData';
import { StatusBadge } from './StatusBadge';
import { Truck, Fuel, Wrench, Calendar, ShieldAlert, User, Activity } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface LogisticsFleetProps {
  entityFilter: Entity;
}

const FLEET_STATUS_COLORS: Record<string, string> = {
  'Active': '#10b981',
  'Maintenance': '#ef4444',
  'Idle': '#f59e0b',
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

export function LogisticsFleet({ entityFilter }: LogisticsFleetProps) {
  const filteredFleet = mockDashboardData.fleet.filter(v => 
    entityFilter === 'All' || v.entity === entityFilter
  );

  const totalFuel = filteredFleet.reduce((acc, v) => acc + v.fuelConsumption, 0);
  const inMaintenance = filteredFleet.filter(v => v.status === 'Maintenance').length;
  
  const statusData = [
    { name: 'Active', value: filteredFleet.filter(v => v.status === 'Active').length },
    { name: 'Maintenance', value: filteredFleet.filter(v => v.status === 'Maintenance').length },
    { name: 'Idle', value: filteredFleet.filter(v => v.status === 'Idle').length },
  ].filter(d => d.value > 0);

  const fuelConsumptionData = filteredFleet.map(v => ({
    plate: v.plate,
    consumption: v.fuelConsumption
  })).sort((a, b) => b.consumption - a.consumption);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Fleet Size', value: filteredFleet.length, icon: <Truck className="w-4 h-4" />, color: 'text-blue-400' },
          { label: 'Active Vehicles', value: filteredFleet.filter(v => v.status === 'Active').length, icon: <Activity className="w-4 h-4" />, color: 'text-green-400' },
          { label: 'In Maintenance', value: inMaintenance, icon: <Wrench className="w-4 h-4" />, color: 'text-red-400' },
          { label: 'Fleet Fuel (L)', value: totalFuel, icon: <Fuel className="w-4 h-4" />, color: 'text-amber-400' },
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
        {/* Status Distribution */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-4">Fleet Status Distribution</h3>
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
                  <Cell key={`cell-${index}`} fill={FLEET_STATUS_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Fuel Consumption Bar */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-4">Vehicle Fuel Consumption (Litre)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fuelConsumptionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="plate" tick={{ fill: '#737373', fontSize: 10 }} />
              <YAxis tick={{ fill: '#737373', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="consumption" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-200">Fleet Operations & Compliance</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-400 bg-neutral-950/50 uppercase border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">Plate No.</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Road Tax Expiry</th>
                <th className="px-4 py-3 font-medium text-right">Last Service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {filteredFleet.length > 0 ? (
                filteredFleet.map((v) => (
                  <tr key={v.plate} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-neutral-200 whitespace-nowrap">{v.plate}</td>
                    <td className="px-4 py-3 text-neutral-400">{v.type}</td>
                    <td className="px-4 py-3 text-neutral-400">{v.entity}</td>
                    <td className="px-4 py-3 text-neutral-200">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-neutral-500" />
                        {v.driver}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-mono text-neutral-300">
                        <Calendar className="w-3 h-3 text-neutral-500" />
                        {v.roadTaxExpiry}
                        {new Date(v.roadTaxExpiry) < new Date('2024-06-01') && (
                          <ShieldAlert className="w-3 h-3 text-red-500" title="Expires Soon!" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-400">{v.lastService}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    No vehicles found for the selected entity.
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
