import React from 'react';

export interface GridRowData {
  id: string;
  employeeCode: string;
  name: string;
  originalHours: number;
  mappedHours: number;
  variance: number;
  status: 'Pending' | 'Approved' | 'Review' | 'Auto-Reconciled (Lunch Adjusted)';
}

interface DataGridProps {
  data: GridRowData[];
  confidenceScore: number;
}

export function DataGrid({ data, confidenceScore }: DataGridProps) {
  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900 flex flex-col">
      {/* Table Header / Summary */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
        <h2 className="text-xs font-medium text-neutral-400">HITL Validation Dashboard</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">MGF Audit Metric:</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
            confidenceScore >= 95 ? 'bg-green-900/20 text-green-400 border-green-800/50' : 
            'bg-yellow-900/20 text-yellow-400 border-yellow-800/50'
          }`}>
            {confidenceScore.toFixed(1)}% Confidence
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-neutral-800/50 text-xs text-neutral-400 border-b border-neutral-800">
            <tr>
              <th className="px-4 py-2 font-medium">Employee Code</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium text-right">Original Hours</th>
              <th className="px-4 py-2 font-medium text-right">Mapped Matrix Hours</th>
              <th className="px-4 py-2 font-medium text-right">Variance</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {data.map((row, index) => (
              <tr 
                key={`${row.employeeCode}-${index}`} 
                className={`transition-colors ${
                  row.status === 'Review' 
                    ? 'bg-red-900/20 hover:bg-red-900/30' 
                    : 'hover:bg-neutral-800/50'
                }`}
              >
                <td className="px-4 py-2 text-neutral-300 font-mono text-xs">{row.employeeCode}</td>
                <td className="px-4 py-2 text-neutral-200">{row.name}</td>
                <td className="px-4 py-2 text-right font-mono text-neutral-400">
                  {row.originalHours.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-neutral-400">
                  {row.mappedHours.toFixed(2)}
                </td>
                <td className={`px-4 py-2 text-right font-mono ${
                  row.status === 'Review' ? 'text-red-400 font-medium' : 'text-neutral-500'
                }`}>
                  {row.status === 'Review' ? '+' : ''}{row.variance.toFixed(2)}
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                    row.status === 'Approved' || row.status === 'Auto-Reconciled (Lunch Adjusted)' ? 'bg-green-900/20 text-green-400 border-green-800/30' :
                    row.status === 'Review' ? 'bg-red-900/20 text-red-400 border-red-800/30' :
                    'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-neutral-500">
                  No data to display. Upload files to begin reconciliation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
