'use client';

import React from 'react';
import { DepartmentBriefing, RagStatus, Exception } from '@/data/morning-briefing-data';

interface DepartmentViewProps {
  data: DepartmentBriefing;
}

const getRagColor = (status: RagStatus) => {
  switch (status) {
    case 'Red': return 'bg-[#C0392B] text-white';
    case 'Amber': return 'bg-[#E67E22] text-white';
    case 'Green': return 'bg-[#27AE60] text-white';
    default: return 'bg-gray-500 text-white';
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

export const DepartmentView: React.FC<DepartmentViewProps> = ({ data }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-white">{data.department} Intelligence</h2>
            <span className="px-2 py-0.5 bg-indigo-900/40 text-indigo-400 text-[10px] font-bold uppercase rounded border border-indigo-800/40">AI Analysis</span>
          </div>
          <p className="text-slate-300 text-lg leading-relaxed max-w-4xl">{data.summary}</p>
        </div>
        <div className={`px-6 py-3 rounded-lg font-bold text-lg shadow-md flex flex-col items-center ${getRagColor(data.rag_status)}`}>
          <span className="text-xs opacity-80 uppercase mb-1">Status</span>
          {data.rag_status}
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Active Exceptions ({data.exceptions.length})
        </h3>
        <div className="grid gap-4">
          {data.exceptions.map((exc: Exception) => (
            <div key={exc.id} className="bg-slate-900/50 p-5 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-lg font-medium text-slate-100">{exc.title}</h4>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(exc.priority)}`}>
                  {exc.priority} Priority
                </span>
              </div>
              <p className="text-slate-400 mb-4">{exc.description}</p>
              
              <div className="bg-indigo-900/20 rounded-lg p-4 border border-indigo-500/20 flex items-start justify-between">
                <div>
                  <div className="text-xs text-indigo-300 font-semibold uppercase tracking-wider mb-1">Recommended Action</div>
                  <p className="text-slate-200">{exc.recommendedAction}</p>
                </div>
                {exc.isApprovalRequired && (
                  <button className="ml-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded shadow transition-colors flex-shrink-0">
                    Approve Action
                  </button>
                )}
              </div>
            </div>
          ))}
          {data.exceptions.length === 0 && (
            <div className="text-slate-400 text-center py-8">
              No active exceptions requiring attention.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
