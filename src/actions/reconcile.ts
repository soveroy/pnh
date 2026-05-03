'use server'

import { createClient as createStatelessClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export interface GridRowData {
  id: string;
  employeeCode: string;
  name: string;
  originalHours: number;
  mappedHours: number;
  variance: number;
  status: 'Pending' | 'Approved' | 'Review' | 'Auto-Reconciled (Lunch Adjusted)';
  aiReason?: string;
}

export interface ReconcileResult {
  success: boolean
  rows?: GridRowData[]
  confidenceScore: number
  downloadPath?: string | null
  error?: string
  insights?: {
    totalAdjusted: number
    highestVarianceName: string
    highestVarianceValue: number
    summary: string
  }
}

export async function runReconciliationAction(csvFilePath: string, excelFilePath: string): Promise<ReconcileResult> {
  try {
    console.log('--- STARTING SUPER-SPEED RECONCILIATION ---');
    const supabase = createStatelessClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    // 1. Fetch files
    const { data: rawPublic } = supabase.storage.from('raw_uploads').getPublicUrl(csvFilePath)
    const { data: templatePublic } = supabase.storage.from('raw_uploads').getPublicUrl(excelFilePath)
    
    const [rawRes, templateRes] = await Promise.all([
      fetch(rawPublic.publicUrl!),
      fetch(templatePublic.publicUrl!)
    ])

    const [rawBuf, templateBuf] = await Promise.all([
      rawRes.arrayBuffer(),
      templateRes.arrayBuffer()
    ])

    // 2. Parse Raw (SheetJS - Fast)
    const rawWb = XLSX.read(rawBuf, { type: 'array' });
    const rawData = XLSX.utils.sheet_to_json(rawWb.Sheets[rawWb.SheetNames[0]], { header: 1 }) as any[][];

    // 3. Parse Template (SheetJS - Fast)
    const templateWb = XLSX.read(templateBuf, { type: 'array' });
    const ws1 = templateWb.Sheets['Staff Attendance-1st Half'];
    const ws2 = templateWb.Sheets['Staff Attendance-2nd Half'];
    
    const data1 = XLSX.utils.sheet_to_json(ws1, { header: 1 }) as any[][];
    const data2 = XLSX.utils.sheet_to_json(ws2, { header: 1 }) as any[][];

    // 4. Extraction Logic
    const records: any[] = [];
    const headerIdx = 6;
    for (let i = headerIdx + 1; i < rawData.length; i++) {
      const row = rawData[i];
      const code = String(row[0] || '').trim();
      const name = String(row[1] || '').trim();
      const designation = String(row[6] || '').trim().toUpperCase();
      const rowStr = row.join(' ').toUpperCase();
      
      let hrs = parseFloat(String(row[8] || '0').replace(/,/g, '')) || 0;
      
      if (code && hrs > 0 && rowStr.includes('AMK')) {
        records.push({ code, name, hrs, designation });
      }
    }

    // 5. Mapping Logic (SheetJS style)
    const auditRows: GridRowData[] = [];
    const weekdays_count = 22;

    for (const rec of records) {
      const { code, name, hrs } = rec;
      
      // Calculate Audited Hours (Lunch Rule)
      const shiftHrs = hrs / weekdays_count;
      let auditedTotal = hrs;
      if (shiftHrs > 5.0) {
        auditedTotal = hrs - (weekdays_count * 1.0);
      }

      const variance = Math.abs(hrs - auditedTotal);
      
      auditRows.push({
        id: code,
        employeeCode: code,
        name: name,
        originalHours: hrs,
        mappedHours: auditedTotal,
        variance: variance,
        status: variance > 0.1 ? 'Auto-Reconciled (Lunch Adjusted)' : 'Approved',
        aiReason: variance > 0.1 
          ? `Lunch adjustment applied. Employee averaged ${(hrs/weekdays_count).toFixed(1)} hrs/shift over ${weekdays_count} days. Since average > 5.0h, a 1.0h deduction per day was applied.`
          : 'Hours match expected patterns. No adjustment required.'
      });
    }

    // Generate Insights
    const adjustedCount = auditRows.filter(r => r.variance > 0.1).length;
    const sortedByVariance = [...auditRows].sort((a, b) => b.variance - a.variance);
    const highest = sortedByVariance[0];

    const insights = {
      totalAdjusted: adjustedCount,
      highestVarianceName: highest?.name || 'N/A',
      highestVarianceValue: highest?.variance || 0,
      summary: `Processed ${auditRows.length} employees. ${adjustedCount} records required lunch-break adjustments. Highest variance detected for ${highest?.name || 'N/A'}.`
    };

    console.log('--- RECONCILIATION COMPLETE ---');
    return { 
      success: true, 
      rows: auditRows, 
      confidenceScore: auditRows.length > 0 ? Math.max(0, 100 - (adjustedCount / auditRows.length * 50)) : 0,
      downloadPath: null,
      insights
    };

  } catch (error: any) {
    console.error('Super-speed error:', error);
    return { success: false, error: error.message, confidenceScore: 0 };
  }
}

export async function validateTimesheetAction(filePath: string): Promise<{ success: boolean, checks: { label: string, status: 'pass' | 'warn' | 'fail', detail: string }[] }> {
  try {
    const supabase = createStatelessClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
    const { data: publicUrl } = supabase.storage.from('raw_uploads').getPublicUrl(filePath)
    const res = await fetch(publicUrl.publicUrl!)
    const buf = await res.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

    const checks: { label: string, status: 'pass' | 'warn' | 'fail', detail: string }[] = []

    // 1. Header Detection
    let foundHeader = false
    for (let r = 0; r < Math.min(15, data.length); r++) {
      if (data[r].join('|').toUpperCase().includes('EMPLOYEE NO')) {
        foundHeader = true
        break
      }
    }
    checks.push({
      label: 'Header Detection',
      status: foundHeader ? 'pass' : 'fail',
      detail: foundHeader ? 'Found "Employee No" header row.' : 'Could not locate standard header row.'
    })

    // 2. Data Volume
    const records = data.length - 7
    checks.push({
      label: 'Data Volume',
      status: records > 0 ? 'pass' : 'warn',
      detail: records > 0 ? `Detected ${records} potential employee records.` : 'File appears to be empty or malformed.'
    })

    return { success: true, checks }
  } catch (e: any) {
    return { success: false, checks: [{ label: 'File Parse', status: 'fail', detail: e.message }] }
  }
}
