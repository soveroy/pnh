'use client';

import { useState, useEffect } from 'react';
import { LayoutContainer } from '@/components/LayoutContainer';
import { UploadArea } from '@/components/UploadArea';
import { ActionBar } from '@/components/ActionBar';
import { DataGrid, GridRowData } from '@/components/DataGrid';
import { getSupabaseClient } from '@/utils/supabase';
import { validateTimesheetAction, runReconciliationAction } from '@/actions/reconcile';
import { AiInsightPanel } from '@/components/AiInsightPanel';

export default function HRTimesheetsPage() {
  const [data, setData] = useState<GridRowData[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [csvPath, setCsvPath] = useState('');
  const [excelPath, setExcelPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadPath, setDownloadPath] = useState('');

  // AI Intelligence States
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<{ label: string, status: 'pass' | 'warn' | 'fail', detail: string }[] | null>(null);
  const [insights, setInsights] = useState<{ summary: string, totalAdjusted: number } | null>(null);

  useEffect(() => {
    fetch('/api/notify-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'hr-timesheets',
        action: 'page_visit'
      })
    }).catch(err => console.error('Failed to notify page visit:', err))
  }, [])

  const handleFilesReady = async (csv: string, excel: string) => {
    setCsvPath(csv);
    setExcelPath(excel);
    
    // Run AI Pre-flight validation on CSV
    setIsValidating(true);
    const res = await validateTimesheetAction(csv);
    if (res.success) setValidation(res.checks);
    setIsValidating(false);
  };

  const handleReset = () => {
    setCsvPath('');
    setExcelPath('');
    setData([]);
    setConfidence(0);
    setDownloadPath('');
    setValidation(null);
    setInsights(null);
  };

  const handleRunReconciliation = async () => {
    if (!csvPath || !excelPath) {
      alert('Cannot start: One or both files are missing.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const result = await runReconciliationAction(csvPath, excelPath);
      
      if (result.success && result.rows) {
        setData(result.rows);
        setConfidence(result.confidenceScore);
        setDownloadPath('READY');
        if (result.insights) setInsights(result.insights);

        // Notify usage centrally (fail-safe)
        fetch('/api/notify-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'hr-timesheets',
            action: 'run_automation',
            status: 'success',
            meta: {
              rowsCount: result.rows.length,
              confidenceScore: result.confidenceScore,
              totalAdjusted: result.insights?.totalAdjusted || 0
            }
          })
        }).catch(err => console.error('Usage logging async error:', err));

      } else {
        throw new Error(result.error || 'Reconciliation failed');
      }

    } catch (error: any) {
      alert(`Error during reconciliation: ${error.message}`);
      
      // Notify usage centrally of failure
      fetch('/api/notify-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'hr-timesheets',
          action: 'run_automation',
          status: 'error',
          errorMessage: error.message
        })
      }).catch(err => console.error('Usage logging async error:', err));

    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    alert('Export will be available after demo. Dashboard results are audit-ready.');
  };

  return (
    <LayoutContainer title="HR Timesheets Reconciliation" showPdpaBadge={true}>
      <div className="flex flex-col gap-8 h-full">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-neutral-300 uppercase tracking-wider">Data Ingestion</h2>
            {isValidating && <span className="text-[10px] text-amber-500 animate-pulse font-bold tracking-widest uppercase">AI Scanning...</span>}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <UploadArea onFilesReady={handleFilesReady} onReset={handleReset} />
            </div>
            <div className="lg:col-span-1">
              {validation ? (
                <AiInsightPanel 
                  type="pre-flight"
                  title="AI Health Check"
                  summary="Scan of source timesheet complete."
                  checks={validation}
                />
              ) : (
                <div className="h-full border border-neutral-800 rounded-xl border-dashed flex items-center justify-center p-8 text-center">
                  <p className="text-xs text-neutral-600">Upload source file to trigger AI Pre-flight validation.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="flex-1 flex flex-col">
          <ActionBar 
            isReady={!!csvPath && !!excelPath} 
            isProcessing={isProcessing}
            hasOutput={!!downloadPath}
            onRunReconciliation={handleRunReconciliation}
            onExport={handleExport}
          />
          <div className="flex flex-col gap-4">
            {insights && (
              <AiInsightPanel 
                type="post-run"
                title="AI Audit Insights"
                summary={insights.summary}
                score={confidence}
              />
            )}
            <DataGrid 
              data={data} 
              confidenceScore={confidence} 
            />
          </div>
        </section>
      </div>
    </LayoutContainer>
  );
}
