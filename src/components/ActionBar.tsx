import React from 'react';

interface ActionBarProps {
  isReady: boolean;
  isProcessing: boolean;
  hasOutput: boolean;
  onRunReconciliation: () => void;
  onExport: () => void;
}

export function ActionBar({ isReady, isProcessing, hasOutput, onRunReconciliation, onExport }: ActionBarProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-neutral-800 mb-6">
      <div className="text-sm font-medium text-neutral-300 flex items-center gap-2">
        Reconciliation Controls
        {isProcessing && <div className="w-4 h-4 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />}
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={!isReady || isProcessing}
          onClick={(e) => {
            e.preventDefault();
            onRunReconciliation();
          }}
          className="px-3 py-1.5 text-xs font-medium rounded border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Processing AI ETL...' : 'Run AI Reconciliation'}
        </button>
        <button
          disabled={!hasOutput || isProcessing}
          onClick={onExport}
          className="px-3 py-1.5 text-xs font-medium rounded border border-transparent bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Export Submission.xlsx
        </button>
      </div>
    </div>
  );
}
