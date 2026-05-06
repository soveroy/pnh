// Soft Services OT Logic Engine
import * as XLSX from 'xlsx';

// --- Constants ---
export const PUBLIC_HOLIDAYS_2026 = ['2026-04-03']; // Good Friday

export const SHIFT_1_WINDOW = { start: '06:00', end: '08:59', in: '07:00', out: '16:30', wd_thresh: '17:00', sat_thresh: '13:30' };
export const SHIFT_2_WINDOW = { start: '09:00', end: '11:59', in: '10:00', out: '19:00', wd_thresh: '19:30', sat_thresh: '15:00' };
export const SHIFT_3_SAT = { start: '12:00', end: '14:00', in: '12:00', out: '16:00' };

// --- Types ---
export interface TimeRecord {
  code: string;
  name: string;
  group: string;
  date: string; // YYYY-MM-DD
  timeIn: string | null; // HH:mm
  timeOut: string | null; // HH:mm
  dayType: 'WEEKDAY' | 'SATURDAY' | 'OFF DAY' | 'PH';
}

export interface ProcessedDay {
  in: string | null;
  out: string | null;
  ot15: number;
  ot20_days: number;
  ot20_hrs: number;
  shift: string | null;
  isPt: boolean;
}

export interface ProcessingResult {
  employees: Record<string, ProcessedDay[]>;
  summary: {
    totalEmployees: number;
    totalPt: number;
    unclassifiedShifts: number;
    totalOt15: number;
    totalOt20Days: number;
  };
}

// --- Utilities ---
function timeToMins(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minsToTime(m: number | null): string | null {
  if (m === null) return null;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function getDayType(dateStr: string): 'WEEKDAY' | 'SATURDAY' | 'OFF DAY' | 'PH' {
  if (PUBLIC_HOLIDAYS_2026.includes(dateStr)) return 'PH';
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0) return 'OFF DAY';
  if (day === 6) return 'SATURDAY';
  return 'WEEKDAY';
}

export function calculateOt(records: TimeRecord[]): ProcessingResult {
  const empMap: Record<string, TimeRecord[]> = {};
  records.forEach(r => {
    if (!empMap[r.code]) empMap[r.code] = [];
    empMap[r.code].push(r);
  });

  const ptEmployees = new Set<string>();
  const results: Record<string, Record<string, ProcessedDay>> = {};
  
  // 1. PT Detection
  for (const [code, empRecords] of Object.entries(empMap)) {
    let totalHrs = 0;
    let maxHrs = 0;
    let shiftMatch = false;
    
    empRecords.forEach(r => {
      if (r.timeIn && r.timeOut) {
        const inMins = timeToMins(r.timeIn)!;
        const outMins = timeToMins(r.timeOut)!;
        const hrs = (outMins - inMins) / 60;
        totalHrs += hrs;
        if (hrs > maxHrs) maxHrs = hrs;
        
        if ((inMins >= 6 * 60 && inMins <= 8 * 60 + 59) || 
            (inMins >= 9 * 60 && inMins <= 11 * 60 + 59)) {
          shiftMatch = true;
        }
      }
    });
    
    const avgHrs = totalHrs / empRecords.length;
    if (avgHrs <= 5.5 && maxHrs <= 7.0 && !shiftMatch) {
      ptEmployees.add(code);
    }
  }

  // 2. OT Calculation
  let unclassifiedCount = 0;
  let totalOt15 = 0;
  let totalOt20Days = 0;

  for (const [code, empRecords] of Object.entries(empMap)) {
    results[code] = {};
    const isPt = ptEmployees.has(code);
    
    empRecords.forEach(r => {
      const dayRes: ProcessedDay = {
        in: r.timeIn,
        out: r.timeOut,
        ot15: 0,
        ot20_days: 0,
        ot20_hrs: 0,
        shift: null,
        isPt
      };

      if (r.timeIn && r.timeOut && !isPt) {
        const inMins = timeToMins(r.timeIn)!;
        const outMins = timeToMins(r.timeOut)!;
        
        let shift = null;
        let thresh = null;

        if (inMins >= 6 * 60 && inMins <= 8 * 60 + 59) {
          shift = 'SHIFT 1';
          thresh = (r.dayType === 'SATURDAY') ? SHIFT_1_WINDOW.sat_thresh : SHIFT_1_WINDOW.wd_thresh;
        } else if (inMins >= 9 * 60 && inMins <= 11 * 60 + 59) {
          shift = 'SHIFT 2';
          thresh = (r.dayType === 'SATURDAY') ? SHIFT_2_WINDOW.sat_thresh : SHIFT_2_WINDOW.wd_thresh;
        } else if (r.dayType === 'SATURDAY' && inMins >= 12 * 60 && inMins <= 14 * 60) {
          shift = 'SHIFT 3';
        }

        dayRes.shift = shift;

        if (shift === 'SHIFT 1' || shift === 'SHIFT 2') {
          if (r.dayType === 'WEEKDAY' || r.dayType === 'SATURDAY') {
            const threshMins = timeToMins(thresh)!;
            const otHrs = (outMins - threshMins) / 60;
            if (otHrs >= 0.5) {
              dayRes.ot15 = Math.floor(otHrs * 2) / 2;
              totalOt15 += dayRes.ot15;
            }
          } else if (r.dayType === 'OFF DAY' || r.dayType === 'PH') {
            const workedHrs = (outMins - inMins) / 60;
            if (workedHrs <= 4.0) dayRes.ot20_days = 0.5;
            else if (workedHrs <= 8.0) dayRes.ot20_days = 1.0;
            else {
              dayRes.ot20_days = 1.0;
              dayRes.ot20_hrs = Math.floor((workedHrs - 8) * 2) / 2;
            }
            totalOt20Days += dayRes.ot20_days;
          }
        } else if (!shift) {
          unclassifiedCount++;
        }
      }
      results[code][r.date] = dayRes;
    });
  }

  // Convert map to array format for final output if needed
  const finalResults: Record<string, ProcessedDay[]> = {};
  for (const [code, dayMap] of Object.entries(results)) {
    finalResults[code] = Object.values(dayMap);
  }

  return {
    employees: finalResults, // Simplified for now, we'll probably need date keys
    summary: {
      totalEmployees: Object.keys(empMap).length,
      totalPt: ptEmployees.size,
      unclassifiedShifts: unclassifiedCount,
      totalOt15,
      totalOt20Days
    }
  };
}

// Full version with date keys for template mapping
export function processSoftServicesData(records: TimeRecord[]): { 
  resultsByDate: Record<string, Record<string, ProcessedDay>>,
  summary: any
} {
  const result = calculateOt(records);
  
  // Re-map to emp -> date for easier Excel injection
  const resultsByDate: Record<string, Record<string, ProcessedDay>> = {};
  records.forEach(r => {
    if (!resultsByDate[r.code]) resultsByDate[r.code] = {};
    // We already calculated it in calculateOt, but let's just re-organize the data structure
  });

  // Re-calculating in a way that preserves the date key
  const ptEmployees = new Set<string>();
  const empGroups: Record<string, TimeRecord[]> = {};
  records.forEach(r => {
    if (!empGroups[r.code]) empGroups[r.code] = [];
    empGroups[r.code].push(r);
  });

  // PT Detection (same as above)
  for (const [code, empRecs] of Object.entries(empGroups)) {
    let totalHrs = 0; let maxHrs = 0; let shiftMatch = false;
    empRecs.forEach(r => {
      if (r.timeIn && r.timeOut) {
        const inMins = timeToMins(r.timeIn)!;
        const outMins = timeToMins(r.timeOut)!;
        const hrs = (outMins - inMins) / 60;
        totalHrs += hrs; if (hrs > maxHrs) maxHrs = hrs;
        if ((inMins >= 6 * 60 && inMins <= 8 * 60 + 59) || (inMins >= 9 * 60 && inMins <= 11 * 60 + 59)) shiftMatch = true;
      }
    });
    if (totalHrs / empRecs.length <= 5.5 && maxHrs <= 7.0 && !shiftMatch) ptEmployees.add(code);
  }

  const finalMap: Record<string, Record<string, ProcessedDay>> = {};
  let totalOt15 = 0;
  let totalOt20Days = 0;
  let unclassified = 0;

  for (const [code, empRecs] of Object.entries(empGroups)) {
    finalMap[code] = {};
    const isPt = ptEmployees.has(code);
    empRecs.forEach(r => {
      const res: ProcessedDay = { in: r.timeIn, out: r.timeOut, ot15: 0, ot20_days: 0, ot20_hrs: 0, shift: null, isPt };
      if (r.timeIn && r.timeOut && !isPt) {
        const inMins = timeToMins(r.timeIn)!;
        const outMins = timeToMins(r.timeOut)!;
        let shift = null; let thresh = null;
        if (inMins >= 6 * 60 && inMins <= 8 * 60 + 59) {
          shift = 'SHIFT 1'; thresh = (r.dayType === 'SATURDAY') ? SHIFT_1_WINDOW.sat_thresh : SHIFT_1_WINDOW.wd_thresh;
        } else if (inMins >= 9 * 60 && inMins <= 11 * 60 + 59) {
          shift = 'SHIFT 2'; thresh = (r.dayType === 'SATURDAY') ? SHIFT_2_WINDOW.sat_thresh : SHIFT_2_WINDOW.wd_thresh;
        } else if (r.dayType === 'SATURDAY' && inMins >= 12 * 60 && inMins <= 14 * 60) {
          shift = 'SHIFT 3';
        }
        res.shift = shift;
        if (shift === 'SHIFT 1' || shift === 'SHIFT 2') {
          if (r.dayType === 'WEEKDAY' || r.dayType === 'SATURDAY') {
            const threshMins = timeToMins(thresh)!;
            const otHrs = (outMins - threshMins) / 60;
            if (otHrs >= 0.5) { res.ot15 = Math.floor(otHrs * 2) / 2; totalOt15 += res.ot15; }
          } else {
            const worked = (outMins - inMins) / 60;
            if (worked <= 4.0) res.ot20_days = 0.5;
            else if (worked <= 8.0) res.ot20_days = 1.0;
            else { res.ot20_days = 1.0; res.ot20_hrs = Math.floor((worked - 8) * 2) / 2; }
            totalOt20Days += res.ot20_days;
          }
        } else if (!shift) unclassified++;
      }
      finalMap[code][r.date] = res;
    });
  }

  return {
    resultsByDate: finalMap,
    summary: {
      totalEmployees: Object.keys(empGroups).length,
      totalPt: ptEmployees.size,
      unclassifiedShifts: unclassified,
      totalOt15,
      totalOt20Days
    }
  };
}
