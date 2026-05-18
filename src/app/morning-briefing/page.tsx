'use client';

import React, { useState } from 'react';
import { ManagementView } from '@/components/morning-briefing/ManagementView';
import { DepartmentView } from '@/components/morning-briefing/DepartmentView';
import { mockDepartmentData, mockManagementData } from '@/data/morning-briefing-data';
import { LayoutContainer } from '@/components/LayoutContainer';

export const runtime = 'edge';

type Tab = 'Management' | 'Operations' | 'Procurement' | 'Safety' | 'HR Manpower';

const TABS: Tab[] = ['Management', 'Operations', 'Procurement', 'Safety', 'HR Manpower'];

export default function MorningBriefingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Management');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-indigo-500/30">
      <LayoutContainer title="On3oard AI Morning Briefing • PNH Group" showPdpaBadge={true}>
        {/* Context & Purpose Header */}
        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-600 rounded-lg shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Morning Executive Briefing</h2>
              <p className="text-indigo-200 text-sm leading-relaxed max-w-3xl">
                This dashboard replaces manual WhatsApp updates and paper tracking. Every morning at 7:00 AM, the AI analyzes the midnight ERP extract to surface critical exceptions across all departments, allowing management to take action before the first meeting of the day.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Header / Tabs */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl mb-6 shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center mb-4 md:mb-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Department View</span>
            </div>
            
            <div className="flex items-center bg-slate-800/50 rounded-full px-3 py-1.5 border border-slate-700 shadow-inner">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
              <span className="text-[11px] font-medium text-slate-300">Briefings ready at 06:47 AM</span>
            </div>
          </div>
          
          <div className="flex space-x-1 p-1 bg-slate-900 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  whitespace-nowrap py-2.5 px-6 font-medium text-xs transition-all duration-200 rounded-lg
                  ${activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="animate-fadeIn">
          {activeTab === 'Management' ? (
            <ManagementView data={mockManagementData} />
          ) : (
            <DepartmentView data={mockDepartmentData[activeTab]} />
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-12 py-6 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">
            Isolated AI Layer • No Direct ERP Write Access • Human-in-the-loop Required
          </p>
          <p className="text-[10px] text-slate-600">
            Insights generated from scheduled overnight ERP sync at 00:00.
          </p>
        </div>
      </LayoutContainer>
    </div>
  );
}
