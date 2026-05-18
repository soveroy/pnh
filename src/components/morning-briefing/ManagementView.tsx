'use client';

import React from 'react';
import { ManagementBriefing, RagStatus, Exception } from '@/data/morning-briefing-data';

interface ManagementViewProps {
  data: ManagementBriefing;
}

const getRagColor = (status: RagStatus) => {
  switch (status) {
    case 'Red': return 'bg-[#C0392B] text-white';
    case 'Amber': return 'bg-[#E67E22] text-white';
    case 'Green': return 'bg-[#27AE60] text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const getRagDot = (status: RagStatus) => {
  switch (status) {
    case 'Red': return 'bg-[#C0392B]';
    case 'Amber': return 'bg-[#E67E22]';
    case 'Green': return 'bg-[#27AE60]';
    default: return 'bg-gray-500';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High': return 'text-[#C0392B] bg-[#C0392B]/10 border-[#C0392B]/20';
    case 'Medium': return 'text-[#E67E22] bg-[#E67E22]/10 border-[#E67E22]/20';
    case 'Low': return 'text-[#27AE60] bg-[#27AE60]/10 border-[#27AE60]/20';
    default: return 'text-gray-500 bg-gray-100 border-gray-200';
  }
};

export const ManagementView: React.FC<ManagementViewProps> = ({ data }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Executive Summary & Overall Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col justify-center">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Morning Briefing Summary
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed">{data.executive_summary}</p>
        </div>
        
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center justify-center text-center">
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Overall Company Status</h3>
          <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-xl mb-2 ${getRagColor(data.overall_rag_status)}`}>
            <span className="text-3xl font-bold">{data.overall_rag_status}</span>
          </div>
          <span className="text-slate-400 text-sm mt-2">Requires Attention</span>
        </div>
      </div>

      {/* Value Proposition Callout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-4 flex items-center gap-4">
          <div className="text-red-500 font-bold text-lg">OLD WAY</div>
          <p className="text-xs text-slate-400 italic">WhatsApp status updates, paper certifications, manual Excel matching, fragmented site reports.</p>
        </div>
        <div className="bg-green-900/10 border border-green-900/30 rounded-lg p-4 flex items-center gap-4">
          <div className="text-green-500 font-bold text-lg">NEW WAY</div>
          <p className="text-xs text-slate-400 italic">Centralised AI exceptions, 7:00 AM briefing, automated PO/Invoice matching, digital safety compliance.</p>
        </div>
      </div>

      {/* Department Status Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
        <div className="p-5 border-b border-slate-700 bg-slate-800/50">
          <h3 className="text-lg font-semibold text-white">Department Overview</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-slate-700 md:divide-y-0">
          {data.department_summaries.map((dept, idx) => (
            <div key={idx} className="p-6 flex flex-col items-center justify-center bg-slate-800/30 hover:bg-slate-700/30 transition-colors">
              <div className="text-slate-300 font-medium mb-3">{dept.department}</div>
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-2 shadow-sm ${getRagDot(dept.rag_status)}`}></div>
                <span className="text-slate-100 font-semibold">{dept.rag_status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Alerts */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Top Cross-Department Alerts
        </h3>
        <div className="grid gap-4">
          {data.top_alerts.map((alert: Exception, index: number) => (
            <div key={alert.id} className="bg-slate-900/80 p-5 rounded-lg border border-slate-700/80 relative overflow-hidden group">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${getRagDot('Red')}`}></div>
              <div className="flex flex-col md:flex-row md:items-center justify-between ml-3 gap-4">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="text-slate-500 font-mono text-xs mr-3">#{index + 1}</span>
                    <h4 className="text-lg font-medium text-slate-100">{alert.title}</h4>
                    <span className={`ml-3 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded border ${getPriorityColor(alert.priority)}`}>
                      {alert.priority}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{alert.description}</p>
                </div>
                
                <div className="bg-slate-800 rounded p-3 border border-slate-700 flex-1 md:max-w-md">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">AI Recommendation</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-200">{alert.recommendedAction}</span>
                    {alert.isApprovalRequired && (
                      <button className="ml-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded shadow transition-colors flex-shrink-0">
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
