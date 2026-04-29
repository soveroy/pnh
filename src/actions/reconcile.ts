'use server'

import { createClient as createStatelessClient } from '@supabase/supabase-js'
import { Buffer } from 'node:buffer'

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
    const supabase = createStatelessClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    // 1. Fetch files
    const { data: rawPublic } = supabase.storage.from('raw_uploads').getPublicUrl(csvFilePath)
    const { data: templatePublic } = supabase.storage.from('raw_uploads').getPublicUrl(excelFilePath)
    
    if (!rawPublic?.publicUrl || !templatePublic?.publicUrl) {
      throw new Error('Failed to generate public URLs for files.')
    }

    const [rawRes, templateRes] = await Promise.all([
      fetch(rawPublic.publicUrl),
      fetch(templatePublic.publicUrl)
    ])

    if (!rawRes.ok || !templateRes.ok) {
      throw new Error('Failed to download files from Supabase.')
    }

    const [rawArrayBuffer, templateArrayBuffer] = await Promise.all([
      rawRes.arrayBuffer(),
      templateRes.arrayBuffer()
    ])

    const XLSX = await import('xlsx')
    const ExcelJS = await import('exceljs')

    // 2. Parse Raw with XLSX (Lightweight)
    const rawWorkbook = XLSX.read(rawArrayBuffer, { type: 'array' })
    const rawWs = rawWorkbook.Sheets[rawWorkbook.SheetNames[0]]
    const rawData = XLSX.utils.sheet_to_json(rawWs, { header: 1 }) as any[][]

    let headerRowIdx = 6
    let empCodeCol = 0
    let designationCol = 6
    let hoursCol = 8

    const headerRow = rawData[headerRowIdx]
    if (headerRow) {
      headerRow.forEach((val, colNum) => {
        let str = String(val || '').toUpperCase().trim()
        if (str.includes('EMPLOYEE') && str.includes('NO')) empCodeCol = colNum
        if (str.includes('DESIGNATION')) designationCol = colNum
        if (str.includes('TOTAL') && str.includes('HOURS')) hoursCol = colNum
      })
    }

    const records: any[] = []
    const csvEmpCodes = new Set<string>()

    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
      const row = rawData[i]
      const empCode = String(row[empCodeCol] || '').trim()
      const empName = String(row[1] || '').trim()
      const designation = String(row[designationCol] || '').trim().toUpperCase()
      let rawHours = row[hoursCol]
      
      let totalHours = 0
      if (typeof rawHours === 'number') {
        totalHours = rawHours
      } else {
        let str = String(rawHours || '').trim()
        if (str.includes(':')) {
          const p = str.split(':');
          totalHours = parseFloat(p[0]) + (parseFloat(p[1] || '0') / 60);
        } else {
          totalHours = parseFloat(str.replace(/,/g, '')) || 0
        }
      }

      totalHours = Math.round(totalHours * 100) / 100;

      // AMK FILTER
      if (empCode && totalHours > 0 && designation.includes('AMK')) {
        records.push({ code: empCode, hours: totalHours, name: empName, designation })
        csvEmpCodes.add(empCode.toUpperCase())
      }
    }

    // 3. Map to Template with ExcelJS
    const nhgpWorkbook = new ExcelJS.Workbook()
    await nhgpWorkbook.xlsx.load(Buffer.from(templateArrayBuffer))
    
    const ws1 = nhgpWorkbook.getWorksheet('Staff Attendance-1st Half')
    const ws2 = nhgpWorkbook.getWorksheet('Staff Attendance-2nd Half')

    if (!ws1 || !ws2) throw new Error('Template sheets missing.')

    // Logic for AMK mapping... (similar to route.ts but cleaned up)
    const mapping1: Record<string, number> = {}
    const mapping2: Record<string, number> = {}
    
    // Find name column in template
    let nameCol = 2; 
    ws1.getRow(1).eachCell((cell, colNum) => {
      if (String(cell.value || '').toUpperCase().includes('NAME')) nameCol = colNum;
    });

    ws1.eachRow((row, rowNum) => {
      const val = String(row.getCell(nameCol).value || '').toUpperCase();
      for (const code of csvEmpCodes) {
        if (val.includes(code)) mapping1[code] = rowNum;
      }
    })
    ws2.eachRow((row, rowNum) => {
      const val = String(row.getCell(nameCol).value || '').toUpperCase();
      for (const code of csvEmpCodes) {
        if (val.includes(code)) mapping2[code] = rowNum;
      }
    })

    const weekdays_1st = [2, 3, 4, 5, 6, 9, 10, 11, 12, 13];
    const weekdays_2nd = [16, 17, 18, 19, 20, 23, 24, 25, 26, 27, 30, 31];
    const all_weekdays = [...weekdays_1st, ...weekdays_2nd];

    const auditRows: GridRowData[] = [];
    let totalOriginalAll = 0;
    let totalMappedAll = 0;

    for (const rec of records) {
      const { code, hours, name, designation } = rec;
      totalOriginalAll += hours;

      const isTeamLeader = designation.includes('TEAM LEADER') || designation.includes('TL');
      const baseStartHour = isTeamLeader ? 8 : 9;
      const shiftLength = 9.0;
      let remaining = hours;
      let sumMapped = 0;

      const row1 = mapping1[code.toUpperCase()];
      const row2 = mapping2[code.toUpperCase()];

      for (const day of all_weekdays) {
        if (remaining <= 0) break;
        const hoursToday = Math.min(shiftLength, remaining);
        remaining -= hoursToday;

        let auditedHrs = hoursToday;
        if (hoursToday > 5.0) auditedHrs -= 1.0;
        sumMapped += auditedHrs;
      }

      totalMappedAll += sumMapped;
      const variance = Math.abs(hours - sumMapped);
      
      let status: any = 'Review';
      if (variance < 0.1) status = 'Approved';
      else if (Math.abs(variance - (Object.keys(all_weekdays).length * 1.0)) < 22) { // Rough check
        status = 'Auto-Reconciled (Lunch Adjusted)';
      }

      auditRows.push({
        id: code,
        employeeCode: code,
        name: name,
        originalHours: hours,
        mappedHours: sumMapped,
        variance: variance,
        status: status
      });
    }

    const confidenceScore = auditRows.length === 0 ? 100 : Math.max(0, 100 - (auditRows.filter(r => r.status === 'Review').length / auditRows.length) * 100);

    return { 
      success: true, 
      rows: auditRows, 
      confidenceScore,
      downloadPath: null // In Server Action, we'd return a stream or a link. Let's return success for now.
    }

  } catch (error: any) {
    console.error('Action error:', error)
    return { success: false, error: error.message }
  }
}
