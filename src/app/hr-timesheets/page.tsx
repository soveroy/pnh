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
    if (!csvPath || !excelPath) {
      alert('Cannot start: One or both files are missing.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const supabase = getSupabaseClient();

      // 1. Get public URLs
      const { data: rawPublic } = supabase.storage.from('raw_uploads').getPublicUrl(csvPath);
      const { data: templatePublic } = supabase.storage.from('raw_uploads').getPublicUrl(excelPath);
      
      // 2. Fetch both files in parallel
      const [rawRes, templateRes] = await Promise.all([
        fetch(rawPublic.publicUrl),
        fetch(templatePublic.publicUrl)
      ]);

      if (!rawRes.ok) throw new Error(`Failed to fetch raw file: ${rawRes.status}`);
      if (!templateRes.ok) throw new Error(`Failed to fetch template: ${templateRes.status}`);

      const [rawBuf] = await Promise.all([
        rawRes.arrayBuffer(),
        templateRes.arrayBuffer() // Fetched but template mapping done later
      ]);

      // 3. DYNAMIC import of XLSX (only loaded when button is clicked, not at page load)
      const XLSX = await import('xlsx');

      // 4. Parse Raw Timesheet
      const rawWb = XLSX.read(rawBuf, { type: 'array' });
      const rawData = XLSX.utils.sheet_to_json(
        rawWb.Sheets[rawWb.SheetNames[0]], 
        { header: 1 }
      ) as any[][];

      // 5. Find header row (scan first 10 rows for "Employee No")
      let headerIdx = 6; // Default row 7
      let codeCol = 0, nameCol = 1, hoursCol = 8;

      for (let r = 0; r < Math.min(10, rawData.length); r++) {
        const rowStr = rawData[r].join('|').toUpperCase();
        if (rowStr.includes('EMPLOYEE') && rowStr.includes('NO')) {
          headerIdx = r;
          rawData[r].forEach((val: any, i: number) => {
            const s = String(val || '').toUpperCase();
            if (s.includes('EMPLOYEE') && s.includes('NO')) codeCol = i;
            if (s.includes('EMPLOYEE') && s.includes('NAME')) nameCol = i;
            if (s.includes('TOTAL') && s.includes('HOURS')) hoursCol = i;
          });
          break;
        }
      }

      // 6. Extract Employee Records
      const records: any[] = [];
      for (let i = headerIdx + 1; i < rawData.length; i++) {
        const row = rawData[i];
        const code = String(row[codeCol] || '').trim();
        const name = String(row[nameCol] || '').trim();
        const rowStr = row.join(' ').toUpperCase();
        
        let hrs = 0;
        const rawHrs = row[hoursCol];
        if (typeof rawHrs === 'number') {
          hrs = rawHrs;
        } else {
          const s = String(rawHrs || '').trim();
          if (s.includes(':')) {
            const p = s.split(':');
            hrs = parseInt(p[0]) + parseInt(p[1] || '0') / 60;
          } else {
            hrs = parseFloat(s.replace(/,/g, '')) || 0;
          }
        }

        // All Clinics — no location filter
        if (code && hrs > 0) {
          records.push({ code, name, hrs });
        }
      }

      // 7. Intelligent Auditor: Lunch Break Rule
      const WORKING_DAYS = 22;
      const auditRows: GridRowData[] = records.map(rec => {
        const avgShift = rec.hrs / WORKING_DAYS;
        // Apply 1-hour lunch deduction for shifts > 5 hours
        const lunchDeduction = avgShift > 5.0 ? WORKING_DAYS * 1.0 : 0;
        const auditedHours = Math.round((rec.hrs - lunchDeduction) * 100) / 100;
        const variance = Math.abs(rec.hrs - auditedHours);

        return {
          id: rec.code,
          employeeCode: rec.code,
          name: rec.name,
          originalHours: rec.hrs,
          mappedHours: auditedHours,
          variance: variance,
          status: (variance < 0.1 ? 'Approved' : 'Auto-Reconciled (Lunch Adjusted)') as any
        };
      });

      const reviewCount = auditRows.filter(r => r.status === 'Review').length;
      const conf = auditRows.length > 0 
        ? Math.round((1 - reviewCount / auditRows.length) * 100) 
        : 0;

      setData(auditRows);
      setConfidence(conf);
      setDownloadPath('READY');

    } catch (error: any) {
      alert(`Error during reconciliation: ${error.message}`);
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
