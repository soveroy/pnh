'use client';

import { useState } from 'react';
import { LayoutContainer } from '@/components/LayoutContainer';
import { UploadArea } from '@/components/UploadArea';
import { ActionBar } from '@/components/ActionBar';
import { DataGrid, GridRowData } from '@/components/DataGrid';
import { getSupabaseClient } from '@/utils/supabase';

export default function HRTimesheetsPage() {
  const [data, setData] = useState<GridRowData[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [csvPath, setCsvPath] = useState('');
  const [excelPath, setExcelPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadPath, setDownloadPath] = useState('');

  const handleFilesReady = (csv: string, excel: string) => {
    setCsvPath(csv);
    setExcelPath(excel);
  };

  const handleReset = () => {
    setCsvPath('');
    setExcelPath('');
    setData([]);
    setConfidence(0);
    setDownloadPath('');
  };

  const handleRunReconciliation = async () => {
    console.log('Sending request to /api/reconcile (Server Action) with paths:', csvPath, excelPath);
    if (!csvPath || !excelPath) {
      alert('Cannot start: One or both files are missing from UI state.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvFilePath: csvPath, excelFilePath: excelPath }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Server responded with an error');
      }

      setData(result.rows);
      setConfidence(result.confidenceScore);
      setDownloadPath(result.downloadPath);
    } catch (error: any) {
      alert(`Error during reconciliation: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (!downloadPath) return;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from('processed_exports').createSignedUrl(downloadPath, 60);
    if (error || !data) {
      alert('Error creating download link');
    } else {
      window.location.href = data.signedUrl;
    }
  };

  return (
    <LayoutContainer title="HR Timesheets Reconciliation" showPdpaBadge={true}>
      <div className="flex flex-col gap-8 h-full">
        <section>
          <h2 className="text-sm font-medium text-neutral-300 mb-4 uppercase tracking-wider">Data Ingestion</h2>
          <UploadArea onFilesReady={handleFilesReady} onReset={handleReset} />
        </section>

        <section className="flex-1 flex flex-col">
          <ActionBar 
            isReady={!!csvPath && !!excelPath} 
            isProcessing={isProcessing}
            hasOutput={!!downloadPath}
            onRunReconciliation={handleRunReconciliation}
            onExport={handleExport}
          />
          <DataGrid 
            data={data} 
            confidenceScore={confidence} 
          />
        </section>
      </div>
    </LayoutContainer>
  );
}
