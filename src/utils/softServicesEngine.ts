// Soft Services OT Engine — runs entirely in the browser using SheetJS
// Fixes: ExcelJS edge-runtime corruption, wrong column indexing
import * as XLSX from 'xlsx'

// --- Constants ---
export const PUBLIC_HOLIDAYS_2026: Record<string, string> = {
  '2026-04-03': 'Good Friday'
}

export interface TimeRecord {
  code: string
  name: string
  group: string
  date: string  // YYYY-MM-DD
  timeIn: string | null   // HH:mm
  timeOut: string | null  // HH:mm
  dayType: 'WEEKDAY' | 'SATURDAY' | 'OFF DAY' | 'PH'
}

export interface DayResult {
  in: string | null
  out: string | null
  ot15: number        // OT 1.5x hours
  ot20days: number    // OT 2.0x days (0.5 or 1.0)
  ot20hrs: number     // Additional OT 2.0x hours beyond 8h worked
  shift: string | null
  isPt: boolean
}

export interface SoftServicesOutput {
  attendanceBase64: string
  reportBase64: string
  summary: {
    totalEmployees: number
    totalPt: number
    unclassifiedShifts: number
    totalOt15: number
    totalOt20Days: number
  }
  errors: string[]
}

// ---------- helpers ----------
function parseDate(rawDate: any): string {
  if (!rawDate) return ''
  if (rawDate instanceof Date) return rawDate.toISOString().slice(0, 10)
  const s = String(rawDate).trim()
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // Excel serial
  if (!isNaN(Number(rawDate))) {
    const d = XLSX.SSF.parse_date_code(Number(rawDate))
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  return ''
}

function getDayType(dateStr: string): TimeRecord['dayType'] {
  if (PUBLIC_HOLIDAYS_2026[dateStr]) return 'PH'
  const d = new Date(dateStr + 'T00:00:00Z')
  const dow = d.getUTCDay()  // 0=Sun, 6=Sat
  if (dow === 0) return 'OFF DAY'
  if (dow === 6) return 'SATURDAY'
  return 'WEEKDAY'
}

function toMins(t: string | null): number | null {
  if (!t) return null
  const m = String(t).match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2])
}

function floorHalf(hrs: number): number {
  return Math.floor(hrs * 2) / 2
}

// ---------- parse time sheet ----------
function parseTimeSheet(b64: string): { records: TimeRecord[]; byCode: Record<string, TimeRecord[]> } {
  const wb = XLSX.read(b64, { type: 'base64' })
  const ws = wb.Sheets['EmployeeAttendance']
  if (!ws) throw new Error('Sheet "EmployeeAttendance" not found in Time Sheet')

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]
  const hdr = (rows[0] || []).map((h: any) => String(h || '').trim())
  const col = (name: string) => hdr.indexOf(name)

  const records: TimeRecord[] = []
  const byCode: Record<string, TimeRecord[]> = {}

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row[col('Employee Code')]) continue
    const code = String(row[col('Employee Code')]).trim()
    const dateStr = parseDate(row[col('Date')])
    if (!dateStr) continue
    const rec: TimeRecord = {
      code,
      name: String(row[col('Employee Name')] || ''),
      group: String(row[col('Working Group')] || ''),
      date: dateStr,
      timeIn: row[col('Time In')] ? String(row[col('Time In')]).trim() : null,
      timeOut: row[col('Time Out')] ? String(row[col('Time Out')]).trim() : null,
      dayType: getDayType(dateStr)
    }
    records.push(rec)
    if (!byCode[code]) byCode[code] = []
    byCode[code].push(rec)
  }
  return { records, byCode }
}

// ---------- OT calculation ----------
function calcOt(byCode: Record<string, TimeRecord[]>): {
  ptSet: Set<string>
  resultMap: Record<string, Record<string, DayResult>>
  totalOt15: number
  totalOt20Days: number
  unclassified: number
} {
  const ptSet = new Set<string>()
  
  // Part-time detection
  for (const [code, recs] of Object.entries(byCode)) {
    let total = 0, max = 0, shiftMatch = false
    for (const r of recs) {
      if (r.timeIn && r.timeOut) {
        const hrs = (toMins(r.timeOut)! - toMins(r.timeIn)!) / 60
        total += hrs
        if (hrs > max) max = hrs
        const inM = toMins(r.timeIn)!
        if ((inM >= 360 && inM <= 539) || (inM >= 540 && inM <= 719)) shiftMatch = true
      }
    }
    const avg = total / recs.length
    if (avg <= 5.5 && max <= 7.0 && !shiftMatch) ptSet.add(code)
  }

  const resultMap: Record<string, Record<string, DayResult>> = {}
  let totalOt15 = 0, totalOt20Days = 0, unclassified = 0

  for (const [code, recs] of Object.entries(byCode)) {
    resultMap[code] = {}
    const isPt = ptSet.has(code)

    for (const r of recs) {
      const res: DayResult = { in: r.timeIn, out: r.timeOut, ot15: 0, ot20days: 0, ot20hrs: 0, shift: null, isPt }

      if (r.timeIn && r.timeOut && !isPt) {
        const inM = toMins(r.timeIn)!
        const outM = toMins(r.timeOut)!
        let shift = null, thresh = 0

        if (inM >= 360 && inM <= 539) {        // 06:00–08:59 → Shift 1
          shift = 'SHIFT 1'
          thresh = r.dayType === 'SATURDAY' ? 13 * 60 + 30 : 17 * 60
        } else if (inM >= 540 && inM <= 719) { // 09:00–11:59 → Shift 2
          shift = 'SHIFT 2'
          thresh = r.dayType === 'SATURDAY' ? 15 * 60 : 19 * 60 + 30
        } else if (r.dayType === 'SATURDAY' && inM >= 720 && inM <= 840) { // 12:00–14:00 Sat
          shift = 'SHIFT 3'
        }

        res.shift = shift

        if (shift === 'SHIFT 1' || shift === 'SHIFT 2') {
          if (r.dayType === 'WEEKDAY' || r.dayType === 'SATURDAY') {
            const otHrs = (outM - thresh) / 60
            if (otHrs >= 0.5) { res.ot15 = floorHalf(otHrs); totalOt15 += res.ot15 }
          } else {
            const worked = (outM - inM) / 60
            if (worked <= 4) res.ot20days = 0.5
            else if (worked <= 8) res.ot20days = 1.0
            else { res.ot20days = 1.0; res.ot20hrs = floorHalf(worked - 8) }
            totalOt20Days += res.ot20days
          }
        } else if (!shift) {
          unclassified++
        }
      }
      resultMap[code][r.date] = res
    }
  }

  return { ptSet, resultMap, totalOt15, totalOt20Days, unclassified }
}

// ---------- fill attendance template using SheetJS ----------
// Template column layout (0-indexed):
//   col 2 = Employee Code, col 3 = Name
//   col 7 = April-1 IN, col 8 = April-1 OUT
//   col 9 = April-2 IN, col 10 = April-2 OUT
//   Formula: April day D → IN col = 7 + (D-1)*2, OUT col = 8 + (D-1)*2
//   OT 1.5 row (r+1): individual day OT at same IN cols; total at col 6
//   OT 2.0 row (r+2): same

function setCell(ws: XLSX.WorkSheet, r: number, c: number, v: any) {
  const addr = XLSX.utils.encode_cell({ r, c })
  const t = typeof v === 'number' ? 'n' : 's'
  ws[addr] = { v, t }
}

function fillAttendance(
  templateB64: string,
  resultMap: Record<string, Record<string, DayResult>>,
  ptSet: Set<string>
): string {
  const wb = XLSX.read(templateB64, { type: 'base64', cellStyles: true })
  const SHEETS = ['GEY', 'TPY', 'AMK', 'HOUGANG', 'SERANGOON']

  for (const sheetName of SHEETS) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1')

    for (let r = 5; r <= range.e.r; r++) { // 0-indexed row 5 = Excel row 6
      const codeAddr = XLSX.utils.encode_cell({ r, c: 2 }) // col C
      const codeCell = ws[codeAddr]
      if (!codeCell?.v) continue

      const empCode = String(codeCell.v).trim()
      const empRes = resultMap[empCode]
      if (!empRes) continue

      let totalOt15 = 0
      let totalOt20 = 0

      for (let day = 1; day <= 30; day++) {
        const dateStr = `2026-04-${String(day).padStart(2, '0')}`
        const dayData = empRes[dateStr]
        if (!dayData) continue

        const inCol = 7 + (day - 1) * 2   // 0-indexed
        const outCol = inCol + 1

        if (dayData.in) setCell(ws, r, inCol, dayData.in)
        if (dayData.out) setCell(ws, r, outCol, dayData.out)

        if (dayData.ot15 > 0) {
          setCell(ws, r + 1, inCol, dayData.ot15)
          totalOt15 += dayData.ot15
        }
        if (dayData.ot20days > 0) {
          const val = dayData.ot20hrs > 0 ? `${dayData.ot20days}d ${dayData.ot20hrs}h` : dayData.ot20days
          setCell(ws, r + 2, inCol, val)
          totalOt20 += dayData.ot20days
        }
      }

      // Write totals at col 6 (column G)
      if (totalOt15 > 0) setCell(ws, r + 1, 6, totalOt15)
      if (totalOt20 > 0) setCell(ws, r + 2, 6, totalOt20)
    }
  }

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
}

// ---------- fill OT checking report ----------
function fillOtReport(
  reportB64: string,
  byCode: Record<string, TimeRecord[]>,
  resultMap: Record<string, Record<string, DayResult>>,
  ptSet: Set<string>
): string {
  const wb = XLSX.read(reportB64, { type: 'base64', cellStyles: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return reportB64

  // Fill colors via cell fill — SheetJS pro only, so we add a note column instead
  let rowIdx = 1 // 0-indexed row 1 = Excel row 2

  for (const [code, recs] of Object.entries(byCode)) {
    const empRes = resultMap[code]
    let ot15 = 0, offOt = 0, phOt = 0, hasUnclassified = false
    const isPt = ptSet.has(code)

    for (const [date, d] of Object.entries(empRes)) {
      ot15 += d.ot15
      const dt = getDayType(date)
      if (dt === 'OFF DAY') offOt += d.ot20days
      if (dt === 'PH') phOt += d.ot20days
      if (!d.shift && d.in && !d.isPt) hasUnclassified = true
    }

    setCell(ws, rowIdx, 0, code)
    setCell(ws, rowIdx, 1, recs[0].name)
    setCell(ws, rowIdx, 3, recs[0].group)
    setCell(ws, rowIdx, 4, ot15)     // Weekday OT (TS)
    setCell(ws, rowIdx, 6, offOt)   // Off Day OT (TS)
    setCell(ws, rowIdx, 8, phOt)    // PH OT (TS)

    let note = 'Verified OK'
    if (isPt) note = '[PART-TIME – NO OT]'
    else if (hasUnclassified) note = 'Shift unclassified – manual review required'
    setCell(ws, rowIdx, 10, note)

    rowIdx++
  }

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
}

// ---------- main entry point ----------
export async function runSoftServicesEngine(
  timeSheetB64: string,
  attendanceBlankB64: string,
  otReportB64: string
): Promise<SoftServicesOutput> {
  const errors: string[] = []

  try {
    // 1. Parse
    const { records, byCode } = parseTimeSheet(timeSheetB64)

    // 2. Calculate
    const { ptSet, resultMap, totalOt15, totalOt20Days, unclassified } = calcOt(byCode)

    // 3. Build outputs
    const attendanceBase64 = fillAttendance(attendanceBlankB64, resultMap, ptSet)
    const reportBase64 = fillOtReport(otReportB64, byCode, resultMap, ptSet)

    return {
      attendanceBase64,
      reportBase64,
      summary: {
        totalEmployees: Object.keys(byCode).length,
        totalPt: ptSet.size,
        unclassifiedShifts: unclassified,
        totalOt15,
        totalOt20Days
      },
      errors
    }
  } catch (e: any) {
    errors.push(e.message)
    return {
      attendanceBase64: '',
      reportBase64: '',
      summary: { totalEmployees: 0, totalPt: 0, unclassifiedShifts: 0, totalOt15: 0, totalOt20Days: 0 },
      errors
    }
  }
}
