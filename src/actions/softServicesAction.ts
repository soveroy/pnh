'use server'

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { processSoftServicesData, getDayType, TimeRecord, ProcessedDay } from '@/utils/softServicesEngine';

export interface SoftServicesResult {
  success: boolean;
  error?: string;
  attendanceBase64?: string;
  reportBase64?: string;
  summary?: any;
}

export async function runSoftServicesAutomation(
  timeSheetB64: string,
  attendanceBlankB64: string,
  otCheckingB64: string
): Promise<SoftServicesResult> {
  try {
    // 1. Parse Time Sheet
    const tsWb = XLSX.read(timeSheetB64, { type: 'base64' });
    const tsWs = tsWb.Sheets['EmployeeAttendance'];
    if (!tsWs) throw new Error('Could not find sheet "EmployeeAttendance" in Time Sheet.');
    
    const tsData: any[][] = XLSX.utils.sheet_to_json(tsWs, { header: 1 }) as any[][];
    const headers = tsData[0].map(h => String(h || '').trim());
    
    const idx = {
      code: headers.indexOf('Employee Code'),
      name: headers.indexOf('Employee Name'),
      group: headers.indexOf('Working Group'),
      date: headers.indexOf('Date'),
      in: headers.indexOf('Time In'),
      out: headers.indexOf('Time Out')
    };

    const records: TimeRecord[] = [];
    for (let i = 1; i < tsData.length; i++) {
      const row = tsData[i];
      if (!row[idx.code]) continue;
      
      let dateStr = '';
      const rawDate = row[idx.date];
      if (rawDate instanceof Date) {
        dateStr = rawDate.toISOString().split('T')[0];
      } else if (typeof rawDate === 'number') {
        // Excel serial date
        const d = new Date((rawDate - 25569) * 86400 * 1000);
        dateStr = d.toISOString().split('T')[0];
      } else {
        const s = String(rawDate || '');
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) dateStr = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      }

      if (!dateStr) continue;

      records.push({
        code: String(row[idx.code]).trim(),
        name: String(row[idx.name] || ''),
        group: String(row[idx.group] || ''),
        date: dateStr,
        timeIn: String(row[idx.in] || '').trim() || null,
        timeOut: String(row[idx.out] || '').trim() || null,
        dayType: getDayType(dateStr)
      });
    }

    // 2. Process Logic
    const { resultsByDate, summary } = processSoftServicesData(records);

    // 3. Fill Attendance Template (using ExcelJS for formatting)
    const attWb = new ExcelJS.Workbook();
    await attWb.xlsx.load(Buffer.from(attendanceBlankB64, 'base64'));
    
    const sheetsToProcess = ['GEY', 'TPY', 'AMK', 'HOUGANG', 'SERANGOON'];
    
    for (const sheetName of sheetsToProcess) {
      const ws = attWb.getWorksheet(sheetName);
      if (!ws) continue;

      // Iterate rows to find employees (starting from row 6)
      for (let r = 6; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const codeCell = row.getCell(3).value;
        if (!codeCell) continue;
        
        const empCode = String(codeCell).trim();
        const empRes = resultsByDate[empCode];
        
        if (empRes) {
          let totalOt15 = 0;
          // Loop through days 1-30 (April)
          for (let day = 1; day <= 30; day++) {
            const dateStr = `2026-04-${String(day).padStart(2, '0')}`;
            const colIdx = 7 + (day - 1) * 2;
            const res = empRes[dateStr];
            
            if (res) {
              if (res.in) row.getCell(colIdx).value = res.in;
              if (res.out) row.getCell(colIdx + 1).value = res.out;
              
              if (res.ot15 > 0) {
                const otRow = ws.getRow(r + 1);
                otRow.getCell(colIdx).value = res.ot15;
                totalOt15 += res.ot15;
              }
              
              if (res.ot20_days > 0) {
                const ot2Row = ws.getRow(r + 2);
                let val: any = res.ot20_days;
                if (res.ot20_hrs > 0) val = `${res.ot20_days}d ${res.ot20_hrs}h`;
                ot2Row.getCell(colIdx).value = val;
              }
            }
          }
          // Total OT in Col 6
          ws.getRow(r + 1).getCell(6).value = totalOt15;
        }
      }
    }

    const attBuffer = await attWb.xlsx.writeBuffer();
    const attBase64 = Buffer.from(attBuffer).toString('base64');

    // 4. Generate Report (using ExcelJS)
    const repWb = new ExcelJS.Workbook();
    await repWb.xlsx.load(Buffer.from(otCheckingB64, 'base64'));
    const repWs = repWb.getWorksheet(1); // April sheet
    if (repWs) {
      let rIdx = 2;
      const empCodes = Object.keys(resultsByDate);
      
      const fillStyles = {
        green: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FF00' } },
        yellow: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } },
        grey: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }
      };

      for (const code of empCodes) {
        const empRes = resultsByDate[code];
        const row = repWs.getRow(rIdx);
        
        let ot15 = 0; let offOt = 0; let phOt = 0; let unclassified = false;
        let isPt = false;
        
        const firstRec = records.find(rec => rec.code === code);
        
        for (const [date, res] of Object.entries(empRes)) {
          ot15 += res.ot15;
          const dtype = getDayType(date);
          if (dtype === 'OFF DAY') offOt += res.ot20_days;
          else if (dtype === 'PH') phOt += res.ot20_days;
          if (res.shift === null && res.in !== null && !res.isPt) unclassified = true;
          isPt = res.isPt;
        }

        row.getCell(1).value = code;
        row.getCell(2).value = firstRec?.name || '';
        row.getCell(4).value = firstRec?.group || '';
        row.getCell(5).value = ot15;
        row.getCell(7).value = offOt;
        row.getCell(9).value = phOt;

        let fill = fillStyles.green;
        let note = "Verified OK";
        if (isPt) { fill = fillStyles.grey; note = "Part-time employee – OT not applicable"; }
        else if (unclassified) { fill = fillStyles.yellow; note = "Shift could not be determined – manual review required"; }

        for (let c = 1; c <= 11; c++) {
          row.getCell(c).fill = fill as any;
        }
        row.getCell(11).value = note;
        rIdx++;
      }
    }

    const repBuffer = await repWb.xlsx.writeBuffer();
    const repBase64 = Buffer.from(repBuffer).toString('base64');

    return {
      success: true,
      attendanceBase64: attBase64,
      reportBase64: repBase64,
      summary
    };

  } catch (e: any) {
    console.error('Soft Services Automation Error:', e);
    return { success: false, error: e.message };
  }
}
