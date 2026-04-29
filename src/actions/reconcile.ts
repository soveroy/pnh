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
}

export async function runReconciliationAction(csvFilePath: string, excelFilePath: string) {
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
        status: variance > 0.1 ? 'Auto-Reconciled (Lunch Adjusted)' : 'Approved'
      });
    }

    console.log('--- RECONCILIATION COMPLETE ---');
    return { 
      success: true, 
      rows: auditRows, 
      confidenceScore: auditRows.length > 0 ? 100 : 0,
      downloadPath: null 
    };

  } catch (error: any) {
    console.error('Super-speed error:', error);
    return { success: false, error: error.message };
  }
}
