'use client';

import React, { useState } from 'react';
import { Entity, mockDashboardData } from '@/data/mockDashboardData';
import { ManagementFeed } from './components/ManagementFeed';
import { OperationsTracker } from './components/OperationsTracker';
import { HRReconciliation } from './components/HRReconciliation';
import { ProcurementAudit } from './components/ProcurementAudit';
import { SafetyStatus } from './components/SafetyStatus';
import { LogisticsFleet } from './components/LogisticsFleet';
import { RefreshCw, Shield } from 'lucide-react';

type ModuleTab = 'feed' | 'operations' | 'hr' | 'procurement' | 'safety' | 'logistics';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<ModuleTab>('feed');
  const [entityFilter, setEntityFilter] = useState<Entity>('All');

  const tabs: { id: ModuleTab; label: string }[] = [
    { id: 'feed', label: 'Management Feed' },
    { id: 'operations', label: 'Operations Tracker' },
    { id: 'logistics', label: 'Logistics & Fleet' },
    { id: 'hr', label: 'HR Reconciliation' },
    { id: 'procurement', label: 'Procurement Audit' },
    { id: 'safety', label: 'Safety Compliance' },
  ];

  const entities: Entity[] = ['All', 'PNHR', 'Goodman', 'Passion', 'J&P'];

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100">
      {/* Top Bar */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 py-4 border-b border-neutral-800 bg-neutral-900 shrink-0 gap-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">PNH Group Management Dashboard</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
            <RefreshCw className="w-3 h-3" />
            <span>Last ERP Sync: {mockDashboardData.lastSync}</span>
          </div>
        </div>

        {/* Global Entity Filter */}
        <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-md p-1">
          {entities.map(entity => (
            <button
              key={entity}
              onClick={() => setEntityFilter(entity)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                entityFilter === entity 
                ? 'bg-neutral-800 text-neutral-100 shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              {entity}
            </button>
          ))}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="px-6 border-b border-neutral-800 bg-neutral-900/50 shrink-0 overflow-x-auto hide-scrollbar">
        <div className="flex space-x-6 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto pb-12">
          {activeTab === 'feed' && <ManagementFeed entityFilter={entityFilter} />}
          {activeTab === 'operations' && <OperationsTracker entityFilter={entityFilter} />}
          {activeTab === 'logistics' && <LogisticsFleet entityFilter={entityFilter} />}
          {activeTab === 'hr' && <HRReconciliation entityFilter={entityFilter} />}
          {activeTab === 'procurement' && <ProcurementAudit entityFilter={entityFilter} />}
          {activeTab === 'safety' && <SafetyStatus entityFilter={entityFilter} />}
        </div>
      </main>

      {/* Persistent Security Footer */}
      <footer className="shrink-0 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-sm px-6 py-3 flex items-center justify-center z-10 sticky bottom-0">
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-400 bg-neutral-950 px-4 py-1.5 rounded-full border border-neutral-800/80 shadow-sm">
          <Shield className="w-3.5 h-3.5 text-neutral-500" />
          <span>Isolated AI Layer — No Direct ERP Write Access</span>
        </div>
      </footer>
    </div>
  );
}
