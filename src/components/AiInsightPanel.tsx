import React from 'react';

interface AiInsightPanelProps {
  title: string;
  summary: string;
  score?: number;
  checks?: { label: string; status: 'pass' | 'warn' | 'fail'; detail: string }[];
  type?: 'pre-flight' | 'post-run';
}

export function AiInsightPanel({ title, summary, score, checks, type = 'post-run' }: AiInsightPanelProps) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
      type === 'pre-flight' ? 'border-neutral-800 bg-neutral-900/40' : 'border-blue-800/40 bg-blue-900/10'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${type === 'pre-flight' ? 'bg-amber-500' : 'bg-blue-500'} animate-pulse`} />
          <p className={`text-[11px] font-semibold uppercase tracking-widest ${type === 'pre-flight' ? 'text-amber-500' : 'text-blue-400'}`}>
            {title}
          </p>
        </div>
        {score !== undefined && (
          <div className="flex items-center gap-2">
             <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">Quality Score</span>
             <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
               score >= 90 ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800/50' : 
               score >= 70 ? 'bg-amber-900/20 text-amber-400 border-amber-800/50' : 
               'bg-red-900/20 text-red-400 border-red-800/50'
             }`}>
               {score}%
             </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-300 leading-relaxed">
          {summary}
        </p>

        {checks && checks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {checks.map((check, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-black/20 border border-neutral-800/50">
                <div className="mt-1">
                  {check.status === 'pass' ? (
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : check.status === 'warn' ? (
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-neutral-200">{check.label}</p>
                  <p className="text-[10px] text-neutral-500">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
