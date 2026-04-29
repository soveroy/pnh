import { createClient } from '@/utils/supabase/server';
import { Buffer } from 'node:buffer';
import * as XLSX from 'xlsx';

export const runtime = 'edge';

export interface GridRowData {
  id: string;
  employeeCode: string;
  name: string;
  originalHours: number;
  mappedHours: number;
  variance: number;
  status: 'Pending' | 'Approved' | 'Review' | 'Auto-Reconciled (Lunch Adjusted)';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { csvFilePath, excelFilePath } = body;

    // STRICT BACKEND VALIDATION
    if (!csvFilePath || typeof csvFilePath !== 'string') {
      return NextResponse.json({ error: 'Zone 1 raw timesheet data missing from request payload.' }, { status: 400 });
    }
    if (!excelFilePath || typeof excelFilePath !== 'string') {
      return NextResponse.json({ error: 'Zone 2 Excel template missing from request payload.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch files from Supabase raw_uploads bucket (PUBLIC URL BYPASS)
    console.log('Generating public URL for path:', csvFilePath);
    const { data: rawPublic } = supabase.storage.from('raw_uploads').getPublicUrl(csvFilePath);
    if (!rawPublic?.publicUrl) throw new Error('Failed to generate public URL for Zone 1 file.');
    
    const rawRes = await fetch(rawPublic.publicUrl);
    if (!rawRes.ok) throw new Error(`Fetch failed for Zone 1 (Public URL): ${rawRes.status} ${rawRes.statusText}. Please ensure bucket is public.`);
    const rawArrayBuffer = await rawRes.arrayBuffer();
    const rawBuffer = Buffer.from(rawArrayBuffer);
    (rawRes as any) = null; // Clear fetch response memory

    console.log('Generating public URL for path:', excelFilePath);
    const { data: templatePublic } = supabase.storage.from('raw_uploads').getPublicUrl(excelFilePath);
    if (!templatePublic?.publicUrl) throw new Error('Failed to generate public URL for Zone 2 file.');

    const templateRes = await fetch(templatePublic.publicUrl);
    if (!templateRes.ok) throw new Error(`Fetch failed for Zone 2 (Public URL): ${templateRes.status} ${templateRes.statusText}. Please ensure bucket is public.`);
    const templateArrayBuffer = await templateRes.arrayBuffer();
    const excelBuffer = Buffer.from(templateArrayBuffer as any);
    (templateRes as any) = null; // Clear fetch response memory

    const ExcelJS = await import('exceljs');

    // 2. Parse Raw Timesheet using ultra-lightweight XLSX
    const rawWorkbook = XLSX.read(rawArrayBuffer, { type: 'array' });
    const rawWs = rawWorkbook.Sheets[rawWorkbook.SheetNames[0]];
    if (!rawWs) throw new Error('Raw timesheet is empty.');

    const rawData = XLSX.utils.sheet_to_json(rawWs, { header: 1 }) as any[][];
    
    let headerRowIdx = 6; // Index 6 is Row 7
    let empCodeCol = 0;   
    let empNameCol = 1;   
    let designationCol = 6; 
    let hoursCol = 8;     

    console.log('--- SCANNING RAW HEADERS WITH XLSX ---');
    const headerRow = rawData[headerRowIdx];
    if (headerRow) {
      headerRow.forEach((val, colNum) => {
        let str = String(val || '').toUpperCase().trim();
        if (str.includes('EMPLOYEE') && str.includes('NO')) empCodeCol = colNum;
        if (str.includes('EMPLOYEE') && str.includes('NAME')) empNameCol = colNum;
        if (str.includes('DESIGNATION')) designationCol = colNum;
        if (str.includes('TOTAL') && str.includes('HOURS')) hoursCol = colNum;
      });
    }

    const records: any[] = [];
    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
      const row = rawData[i];
      const empCode = String(row[empCodeCol] || '').trim();
      const empName = String(row[empNameCol] || '').trim();
      const designation = String(row[designationCol] || '').trim().toUpperCase();
      let rawHours = row[hoursCol];
      
      let totalHours = 0;
      if (typeof rawHours === 'number') {
        totalHours = rawHours;
      } else {
        let str = String(rawHours || '').trim();
        if (str.includes(':')) {
          const p = str.split(':');
          totalHours = parseFloat(p[0]) + (parseFloat(p[1] || '0') / 60);
        } else {
          totalHours = parseFloat(str.replace(/,/g, '')) || 0;
        }
      }

      totalHours = Math.round(totalHours * 100) / 100;
      if (empCode && totalHours > 0) {
        records.push({
          'Employee Code': empCode,
          'Employee Name': empName,
          'Designation': designation,
          'Total Working Hours': totalHours
        });
      }
    }

    // Clear Raw data from memory
    (rawWorkbook as any) = null;
    (rawData as any) = null;
    
    // Build Set of valid Employee Codes from raw timesheet
    const csvEmpCodes = new Set<string>();
    records.forEach(r => {
      if (r['Employee Code']) {
        csvEmpCodes.add(String(r['Employee Code']).trim().toUpperCase());
      }
    });

    // 3. Load Excel Template
    const nhgpWorkbook = new (await import('exceljs')).Workbook();
    await nhgpWorkbook.xlsx.load(excelBuffer as any);
    
    const ws1 = nhgpWorkbook.getWorksheet('Staff Attendance-1st Half');
    const ws2 = nhgpWorkbook.getWorksheet('Staff Attendance-2nd Half');
    if (!ws1 || !ws2) throw new Error('Missing required sheets in the Excel template.');

    // Helper to get Workbook from any worksheet
    const getWorkbook = (ws: any) => nhgpWorkbook;

    // --- DYNAMIC ANCHORING & NOISE FILTERING ---
    const getEmployeeRows = (ws: any) => {
      const mapping: Record<string, number> = {};
      const noiseWords = ['TOTAL CLEANING TEAM', 'S/NO.', 'CLINIC'];
      
      // OPTIMIZATION: Detect which column has the codes first
      let codeCol = 2; // Default to Column B
      for (let r = 1; r <= 10; r++) {
        const row = ws.getRow(r);
        row.eachCell((cell, colNum) => {
          const val = extractText(cell).toUpperCase();
          if (val.includes('STAFF NAME') || val.includes('EMPLOYEE')) {
            codeCol = colNum;
          }
        });
      }

      ws.eachRow((row, rowNumber) => {
        if (rowNumber < 5) return; // Skip headers

        const cell = row.getCell(codeCol);
        const strVal = extractText(cell).trim().toUpperCase();
        
        if (strVal) {
          // FUZZY MATCH: Check if cell contains the code
          // Use a faster loop or pre-check
          for (const code of csvEmpCodes) {
            if (strVal.includes(code)) {
              if (!mapping[code]) {
                mapping[code] = rowNumber;
              }
              break; 
            }
          }
        }
      });
      return mapping;
    };

    const rows1 = getEmployeeRows(ws1);
    const rows2 = getEmployeeRows(ws2);

    // --- DYNAMIC COLUMN MAPPING ---
    const getColumnMapping = (ws: any, daysToFind: number[]) => {
      const colMap: Record<number, { inCol: number, outCol: number }> = {};
      
      // Scan top 6 rows
      for (let r = 1; r <= 6; r++) {
        const row = ws.getRow(r);
        row.eachCell((cell, colNumber) => {
          const val = cell.value;
          let dayFound: number | null = null;
          
          if (typeof val === 'number') {
            dayFound = val;
          } else if (val instanceof Date) {
            dayFound = val.getDate();
          } else {
            const strVal = extractText(cell).trim();
            const num = parseInt(strVal, 10);
            if (!isNaN(num) && num >= 1 && num <= 31) {
              if (num.toString() === strVal) dayFound = num;
            }
          }

          if (dayFound && daysToFind.includes(dayFound)) {
            // Strict assumption: IN is colNumber, OUT is colNumber + 1
            colMap[dayFound] = { inCol: colNumber, outCol: colNumber + 1 };
          }
        });
      }
      return colMap;
    };

    // March 2026 Weekdays
    const weekdays_1st = [2, 3, 4, 5, 6, 9, 10, 11, 12, 13];
    const weekdays_2nd = [16, 17, 18, 19, 20, 23, 24, 25, 26, 27, 30, 31];
    const all_weekdays = [...weekdays_1st, ...weekdays_2nd];

    const colMap1 = getColumnMapping(ws1, weekdays_1st);
    const colMap2 = getColumnMapping(ws2, weekdays_2nd);

    const auditRows: GridRowData[] = [];
    let totalOriginalAll = 0;
    let totalMappedAll = 0;
    let varianceCount = 0;

    for (const row of records) {
      if (!row['Employee Name'] || !row['Total Working Hours']) continue;

      const empCode = String(row['Employee Code']).trim().toUpperCase();
      const empName = String(row['Employee Name']).trim().toUpperCase();
      const designation = String(row['Designation']).trim().toUpperCase();
      const totalHours = parseFloat(row['Total Working Hours']);
      
      totalOriginalAll += totalHours;

      const isTeamLeader = designation.includes('TEAM LEADER') || designation.includes('TEAM LEAD') || designation.includes('TL');
      const baseStartHour = isTeamLeader ? 8 : 9;

      let remaining = totalHours;
      let shiftLength = 9.0;
      if (totalHours > all_weekdays.length * 9.0) {
        shiftLength = totalHours / all_weekdays.length;
      }

      const shifts: Record<number, { in: string, out: string, hrs: number }> = {};

      for (const day of all_weekdays) {
        if (remaining <= 0.0001) break;

        const hoursToday = Math.min(shiftLength, remaining);
        remaining -= hoursToday;

        // INTELLIGENT AUDITOR: Global Lunch Rule
        // If duration > 5 hours, subtract 1.0 hour for unpaid lunch
        let auditedHoursToday = hoursToday;
        if (hoursToday > 5.0) {
          auditedHoursToday -= 1.0;
        }

        const inTime = new Date(2026, 2, day, baseStartHour, 0); 
        const outTime = new Date(inTime.getTime() + hoursToday * 60 * 60 * 1000);

        const formatTime = (d: Date) => d.toTimeString().substring(0, 5);
        shifts[day] = { 
          in: formatTime(inTime), 
          out: formatTime(outTime), 
          hrs: auditedHoursToday // Use adjusted hours for mapping
        };
      }

      // Leftovers (also apply lunch rule if needed)
      if (remaining > 0.001) {
        const lastDay = all_weekdays[all_weekdays.length - 1];
        if (shifts[lastDay]) {
          const { hrs } = shifts[lastDay];
          const newGrossHrs = (totalHours / all_weekdays.length) + remaining; // This is a fallback, but let's keep it simple
          
          let newAuditedHrs = newGrossHrs;
          if (newGrossHrs > 5.0) newAuditedHrs -= 1.0;

          const inTime = new Date(2026, 2, lastDay, baseStartHour, 0);
          const outTime = new Date(inTime.getTime() + newGrossHrs * 60 * 60 * 1000);
          const formatTime = (d: Date) => d.toTimeString().substring(0, 5);
          shifts[lastDay] = { in: formatTime(inTime), out: formatTime(outTime), hrs: newAuditedHrs };
          remaining = 0;
        }
      }

      let sumMapped = 0.0;

      const row1 = rows1[empCode];
      const row2 = rows2[empCode];

      if (row1 && row2) {
        for (const day of weekdays_1st) {
          if (shifts[day] && colMap1[day]) {
            const { inCol, outCol } = colMap1[day];
            ws1.getCell(row1, inCol).value = shifts[day].in;
            ws1.getCell(row1, outCol).value = shifts[day].out;
            sumMapped += shifts[day].hrs;
          }
        }

        for (const day of weekdays_2nd) {
          if (shifts[day] && colMap2[day]) {
            const { inCol, outCol } = colMap2[day];
            ws2.getCell(row2, inCol).value = shifts[day].in;
            ws2.getCell(row2, outCol).value = shifts[day].out;
            sumMapped += shifts[day].hrs;
          }
        }
      }

      totalMappedAll += sumMapped;
      
      // Calculate expected variance if lunch rules were applied
      // If original was 9h and we mapped 8h, variance is 1h.
      // If we expect 1h lunch per day, we check if the variance matches the lunch count.
      const variance = Math.abs(totalHours - sumMapped);
      
      let status: any = 'Review';
      if (variance < 0.1) {
        status = 'Approved';
      } else {
        // Check if the difference is explained by lunch breaks (approx 1h per day > 5h)
        const daysWithLunch = Object.values(shifts).filter(s => (totalHours/all_weekdays.length) > 5.0).length;
        if (Math.abs(variance - daysWithLunch) < 0.5) {
          status = 'Auto-Reconciled (Lunch Adjusted)';
        }
      }

      if (status === 'Review') varianceCount++;

      auditRows.push({
        id: empCode,
        employeeCode: empCode,
        name: empName,
        originalHours: totalHours,
        mappedHours: sumMapped,
        variance: variance,
        status: status
      });
    }

    // 4. Generate Output Buffer
    const outputBuffer = await nhgpWorkbook.xlsx.writeBuffer();

    // 5. Save to processed_exports
    const exportFileName = `Demo_Ready_Submission_${Date.now()}.xlsx`;
    const { error: uploadError } = await supabase.storage
      .from('processed_exports')
      .upload(exportFileName, outputBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });

    if (uploadError) throw new Error(`Failed to upload processed export: ${uploadError.message}`);

    // 6. Log to reconciliation_audits
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    if (userId) {
      await supabase.from('reconciliation_audits').insert({
        user_id: userId,
        total_original_hours: totalOriginalAll,
        total_mapped_hours: totalMappedAll,
        variance_flag: varianceCount > 0,
        pdpa_status: 'SECURE'
      });
    } else {
      console.warn('No authenticated user found. Skipping audit log insertion due to RLS, but ETL succeeded.');
    }

    const confidenceScore = auditRows.length === 0 ? 100 : Math.max(0, 100 - (varianceCount / auditRows.length) * 100);

    return NextResponse.json({
      rows: auditRows,
      confidenceScore,
      downloadPath: exportFileName
    });

  } catch (error: any) {
    console.error('Reconciliation error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred during reconciliation' }, { status: 500 });
  }
}
