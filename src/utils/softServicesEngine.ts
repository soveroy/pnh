// Soft Services OT Engine v2 — runs entirely in the browser using SheetJS
// v2 changes: full SG PH calendar, smart shift detection (clock-in + clock-out),
//             OT 2.0 days + additional hours, sheet validation (GREEN/STALE),
//             target-month auto-detection, part-time detection fix
import * as XLSX from 'xlsx'

// =============================================================================
// SINGAPORE PUBLIC HOLIDAYS 2025 & 2026
// =============================================================================
export const SG_PUBLIC_HOLIDAYS: Set<string> = new Set([
  // 2025
  '2025-01-01', // New Year's Day
  '2025-01-29', // Chinese New Year Day 1
  '2025-01-30', // Chinese New Year Day 2
  '2025-03-31', // Hari Raya Puasa
  '2025-04-18', // Good Friday
  '2025-05-01', // Labour Day
  '2025-05-12', // Vesak Day
  '2025-06-07', // Hari Raya Haji
  '2025-08-09', // National Day
  '2025-10-20', // Deepavali
  '2025-12-25', // Christmas Day
  // 2026
  '2026-01-01', // New Year's Day
  '2026-02-17', // Chinese New Year Day 1
  '2026-02-18', // Chinese New Year Day 2
  '2026-03-20', // Hari Raya Puasa (est.)
  '2026-04-03', // Good Friday
  '2026-05-01', // Labour Day
  '2026-05-31', // Vesak Day
  '2026-05-27', // Hari Raya Haji (est.)
  '2026-08-09', // National Day
  '2026-11-08', // Deepavali (est.)
  '2026-12-25', // Christmas Day
])

// =============================================================================
// BUSINESS RULES (mirror Python v2)
// =============================================================================
// Weekday: Shift 1 anchor 07:00, OT after 17:00; Shift 2 anchor 10:00, OT after 19:30
// Saturday: Shift 1 OT after 13:30; Shift 2 OT after 15:00; Shift 3 (12:00 clock-in) → no OT
// Smart detection: ≤08:30 → Shift1; ≥09:30 → Shift2; ambiguous → use clock-out ≤17:30 → Shift1
const SHIFT1_LATEST_CLOCKIN_M  = 8 * 60 + 30   // 08:30
const SHIFT2_EARLIEST_CLOCKIN_M = 9 * 60 + 30  // 09:30
const SHIFT1_LATEST_CLOCKOUT_M = 17 * 60 + 30  // 17:30 tie-breaker

const WEEKDAY_SHIFTS = [
  { name: 'Shift 1', otStartM: 17 * 60 },       // OT after 17:00
  { name: 'Shift 2', otStartM: 19 * 60 + 30 },  // OT after 19:30
]
const SAT_SHIFTS = [
  { name: 'Sat 1', anchorM: 7 * 60,  otStartM: 13 * 60 + 30 },
  { name: 'Sat 2', anchorM: 10 * 60, otStartM: 15 * 60 },
]
const SAT_NO_OT_MIN = 11 * 60 + 30  // 11:30 clock-in → 12:00 shift → no OT
const SAT_NO_OT_MAX = 12 * 60 + 30  // 12:30

// =============================================================================
// INTERFACES
// =============================================================================
export interface TimeRecord {
  code: string
  name: string
  group: string
  date: string       // YYYY-MM-DD
  timeIn: string | null
  timeOut: string | null
  dayType: 'WEEKDAY' | 'SAT' | 'SUN' | 'PH'
}

export interface DayResult {
  in: string | null
  out: string | null
  ot15: number         // OT 1.5x hours
  ot20days: number     // OT 2.0x days (0.5 or 1.0)
  ot20hrs: number      // Additional OT 2.0x hours beyond 8h worked (rounded to 0.5)
  shift: string | null
  isPt: boolean
}

export interface SheetStatus {
  sheet: string
  file: string
  detectedPeriod: string
  overlapPct: number
  status: 'GREEN' | 'STALE' | 'PARTIAL'
  action: string
}

export interface SoftServicesOutput {
  attendanceBase64: string
  attendance2Base64?: string
  reportBase64: string
  summary: {
    totalEmployees: number
    totalPt: number
    unclassifiedShifts: number
    totalOt15: number
    totalOt20Days: number
    totalOt20AdditionalHrs: number
    targetMonth: string
  }
  sheetStatus: SheetStatus[]
  errors: string[]
}

// =============================================================================
// HELPERS
// =============================================================================
function parseDate(rawDate: any): string {
  if (!rawDate) return ''
  if (rawDate instanceof Date) return rawDate.toISOString().slice(0, 10)
  const s = String(rawDate).trim()
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (!isNaN(Number(rawDate))) {
    const d = XLSX.SSF.parse_date_code(Number(rawDate))
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  return ''
}

function getDayType(dateStr: string): TimeRecord['dayType'] {
  if (SG_PUBLIC_HOLIDAYS.has(dateStr)) return 'PH'
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay() // 0=Sun, 6=Sat
  if (dow === 0) return 'SUN'
  if (dow === 6) return 'SAT'
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

// =============================================================================
// SMART SHIFT DETECTION
// =============================================================================
function detectWeekdayShift(inM: number, outM: number): typeof WEEKDAY_SHIFTS[0] | null {
  if (inM <= SHIFT1_LATEST_CLOCKIN_M) return WEEKDAY_SHIFTS[0]
  if (inM >= SHIFT2_EARLIEST_CLOCKIN_M) return WEEKDAY_SHIFTS[1]
  // Ambiguous zone: use clock-out as tie-breaker
  return outM <= SHIFT1_LATEST_CLOCKOUT_M ? WEEKDAY_SHIFTS[0] : WEEKDAY_SHIFTS[1]
}

function detectSaturdayShift(inM: number): { otStartM: number | null; name: string } | null {
  // 11:30–12:30 → 12:00 shift → no OT
  if (inM >= SAT_NO_OT_MIN && inM <= SAT_NO_OT_MAX) return { name: 'Sat 3', otStartM: null }
  // Nearest anchor
  let best = SAT_SHIFTS[0], bestDiff = Math.abs(inM - SAT_SHIFTS[0].anchorM)
  for (const s of SAT_SHIFTS) {
    const diff = Math.abs(inM - s.anchorM)
    if (diff < bestDiff) { best = s; bestDiff = diff }
  }
  return best
}

// =============================================================================
// TARGET MONTH AUTO-DETECTION
// =============================================================================
function detectTargetMonth(records: TimeRecord[]): string {
  const freq: Record<string, number> = {}
  for (const r of records) {
    const ym = r.date.substring(0, 7)
    freq[ym] = (freq[ym] || 0) + 1
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

// =============================================================================
// PARSE TIME SHEET
// =============================================================================
function parseTimeSheet(b64: string): { records: TimeRecord[]; byCode: Record<string, TimeRecord[]> } {
  const wb = XLSX.read(b64, { type: 'base64' })
  const ws = wb.Sheets['EmployeeAttendance']
  if (!ws) throw new Error('Sheet "EmployeeAttendance" not found in Time Sheet')

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]
  const hdr = (rows[0] || []).map((h: any) => String(h || '').trim())
  const col = (name: string) => hdr.indexOf(name)

  const rawRecords: TimeRecord[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row[col('Employee Code')]) continue
    const dateStr = parseDate(row[col('Date')])
    if (!dateStr) continue
    rawRecords.push({
      code: String(row[col('Employee Code')]).trim(),
      name: String(row[col('Employee Name')] || ''),
      group: String(row[col('Working Group')] || ''),
      date: dateStr,
      timeIn: row[col('Time In')] ? String(row[col('Time In')]).trim() : null,
      timeOut: row[col('Time Out')] ? String(row[col('Time Out')]).trim() : null,
      dayType: getDayType(dateStr),
    })
  }

  // Consolidate duplicates: earliest IN / latest OUT per day per employee
  const byCode: Record<string, TimeRecord[]> = {}
  for (const r of rawRecords) {
    if (!byCode[r.code]) byCode[r.code] = []
    const existing = byCode[r.code].find(e => e.date === r.date)
    if (!existing) {
      byCode[r.code].push({ ...r })
    } else {
      if (r.timeIn && r.timeOut && r.timeIn === r.timeOut) continue
      const inM = toMins(r.timeIn), outM = toMins(r.timeOut)
      const eInM = toMins(existing.timeIn), eOutM = toMins(existing.timeOut)
      if (inM !== null && (eInM === null || inM < eInM)) existing.timeIn = r.timeIn
      if (outM !== null && (eOutM === null || outM > eOutM)) existing.timeOut = r.timeOut
    }
  }

  return { records: Object.values(byCode).flat(), byCode }
}

// =============================================================================
// OT CALCULATION
// =============================================================================
function calcOt(byCode: Record<string, TimeRecord[]>): {
  ptSet: Set<string>
  resultMap: Record<string, Record<string, DayResult>>
  totalOt15: number
  totalOt20Days: number
  totalOt20AdditionalHrs: number
  unclassified: number
} {
  // Part-time detection (v2: only consider days where they actually worked)
  const ptSet = new Set<string>()
  for (const [code, recs] of Object.entries(byCode)) {
    const workedRecs = recs.filter(r => r.timeIn && r.timeOut && r.timeIn !== r.timeOut)
    if (workedRecs.length === 0) continue
    let total = 0, maxH = 0
    for (const r of workedRecs) {
      const hrs = (toMins(r.timeOut)! - toMins(r.timeIn)!) / 60
      total += hrs
      if (hrs > maxH) maxH = hrs
    }
    const avg = total / workedRecs.length
    if (avg <= 5.5 && maxH <= 6.0) ptSet.add(code)
  }

  const resultMap: Record<string, Record<string, DayResult>> = {}
  let totalOt15 = 0, totalOt20Days = 0, totalOt20AdditionalHrs = 0, unclassified = 0

  for (const [code, recs] of Object.entries(byCode)) {
    resultMap[code] = {}
    const isPt = ptSet.has(code)

    for (const r of recs) {
      const res: DayResult = { in: r.timeIn, out: r.timeOut, ot15: 0, ot20days: 0, ot20hrs: 0, shift: null, isPt }

      if (r.timeIn && r.timeOut && r.timeIn !== r.timeOut && !isPt) {
        const inM = toMins(r.timeIn)!
        const outM = toMins(r.timeOut)!

        if (r.dayType === 'WEEKDAY') {
          const shift = detectWeekdayShift(inM, outM)
          res.shift = shift?.name ?? null
          if (shift) {
            const otHrs = (outM - shift.otStartM) / 60
            if (otHrs >= 0.5) { res.ot15 = floorHalf(otHrs); totalOt15 += res.ot15 }
          } else {
            unclassified++
          }

        } else if (r.dayType === 'SAT') {
          const shift = detectSaturdayShift(inM)
          res.shift = shift?.name ?? null
          if (shift && shift.otStartM !== null) {
            const otHrs = (outM - shift.otStartM) / 60
            if (otHrs >= 0.5) { res.ot15 = floorHalf(otHrs); totalOt15 += res.ot15 }
          }
          // Sat 3 (12:00 shift) → otStartM is null → 0 OT (already 0 by default)

        } else {
          // SUN or PH → OT 2.0
          res.shift = r.dayType
          const worked = (outM - inM) / 60
          if (worked <= 4) res.ot20days = 0.5
          else {
            res.ot20days = 1.0
            if (worked > 8) res.ot20hrs = floorHalf(worked - 8)
          }
          totalOt20Days += res.ot20days
          totalOt20AdditionalHrs += res.ot20hrs
        }
      }

      resultMap[code][r.date] = res
    }
  }

  return { ptSet, resultMap, totalOt15, totalOt20Days, totalOt20AdditionalHrs, unclassified }
}

// =============================================================================
// SHEET VALIDATION (GREEN / STALE)
// =============================================================================
function validateAttendanceSheets(b64s: string[], targetYearMonth: string): SheetStatus[] {
  const [yr, mo] = targetYearMonth.split('-').map(Number)
  const daysInMonth = new Date(yr, mo, 0).getDate()
  const targetDays = new Set<string>()
  for (let d = 1; d <= daysInMonth; d++) {
    targetDays.add(`${targetYearMonth}-${String(d).padStart(2, '0')}`)
  }

  const statuses: SheetStatus[] = []
  const fileNames = ['Attendance 1', 'Attendance 2']

  b64s.forEach((b64, fi) => {
    if (!b64) return
    const wb = XLSX.read(b64, { type: 'base64' })
    for (const sheetName of wb.SheetNames) {
      if (/^sheet\d*$/i.test(sheetName)) continue
      const ws = wb.Sheets[sheetName]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]

      // Date row is row index 3 (0-based) = Excel row 4
      const dateRow = rows[3] || []
      const sheetDates = new Set<string>()
      for (const v of dateRow) {
        const ds = parseDate(v)
        if (ds) sheetDates.add(ds)
      }

      if (sheetDates.size === 0) {
        statuses.push({ sheet: sheetName, file: fileNames[fi], detectedPeriod: '(no dates found)', overlapPct: 0, status: 'STALE', action: 'SKIPPED — no dates parseable' })
        continue
      }

      const overlap = [...sheetDates].filter(d => targetDays.has(d)).length
      const pct = Math.round((overlap / daysInMonth) * 100 * 10) / 10
      const sorted = [...sheetDates].sort()
      const period = `${sorted[0]} → ${sorted[sorted.length - 1]}`

      let status: SheetStatus['status'], action: string
      if (pct >= 90) { status = 'GREEN'; action = 'OT extracted' }
      else if (pct >= 50) { status = 'PARTIAL'; action = 'SKIPPED — HR must re-file with full month coverage' }
      else { status = 'STALE'; action = 'SKIPPED — period does not match target month' }

      statuses.push({ sheet: sheetName, file: fileNames[fi], detectedPeriod: period, overlapPct: pct, status, action })
    }
  })

  return statuses
}

// =============================================================================
// FILL ATTENDANCE TEMPLATE
// =============================================================================
function setCell(ws: XLSX.WorkSheet, r: number, c: number, v: any) {
  const addr = XLSX.utils.encode_cell({ r, c })
  ws[addr] = { v, t: typeof v === 'number' ? 'n' : 's' }
}

function fillAttendance(
  templateB64: string,
  resultMap: Record<string, Record<string, DayResult>>,
  ptSet: Set<string>,
  targetYearMonth: string
): string {
  const wb = XLSX.read(templateB64, { type: 'base64', cellStyles: true })
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1')
    for (let r = 5; r <= range.e.r; r++) {
      const codeCell = ws[XLSX.utils.encode_cell({ r, c: 2 })]
      if (!codeCell?.v) continue
      const empCode = String(codeCell.v).trim()
      const empRes = resultMap[empCode]
      if (!empRes) continue
      let totalOt15 = 0, totalOt20 = 0
      for (let day = 1; day <= 31; day++) {
        const dateStr = `${targetYearMonth}-${String(day).padStart(2, '0')}`
        const dayData = empRes[dateStr]
        if (!dayData) continue
        const inCol = 7 + (day - 1) * 2
        if (dayData.in) setCell(ws, r, inCol, dayData.in)
        if (dayData.out) setCell(ws, r, inCol + 1, dayData.out)
        if (dayData.ot15 > 0) { setCell(ws, r + 1, inCol, dayData.ot15); totalOt15 += dayData.ot15 }
        if (dayData.ot20days > 0) {
          const val = dayData.ot20hrs > 0 ? `${dayData.ot20days}d ${dayData.ot20hrs}h` : dayData.ot20days
          setCell(ws, r + 2, inCol, val)
          totalOt20 += dayData.ot20days
        }
      }
      if (totalOt15 > 0) setCell(ws, r + 1, 6, totalOt15)
      if (totalOt20 > 0) setCell(ws, r + 2, 6, totalOt20)
    }
  }
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
}

// =============================================================================
// EXTRACT ATTENDANCE DATA FOR VERIFICATION
// =============================================================================
interface AttInfo { code: string; name: string; location: string; ot15: number | null; ot20: number | null }

function extractAttendanceData(b64s: string[]): Record<string, AttInfo> {
  const result: Record<string, AttInfo> = {}
  for (const b64 of b64s) {
    if (!b64) continue
    const wb = XLSX.read(b64, { type: 'base64' })
    for (const sheetName of wb.SheetNames) {
      if (/^sheet\d*$/i.test(sheetName)) continue
      const ws = wb.Sheets[sheetName]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]
      let curCode: string | null = null
      for (const row of rows) {
        if (!row || row.length < 7) continue
        const code = row[2] ? String(row[2]).trim() : null
        if (code && /^G/i.test(code)) {
          curCode = code
          if (!result[curCode]) result[curCode] = { code: curCode, name: String(row[3] || ''), location: sheetName, ot15: null, ot20: null }
        } else if (curCode && String(row[5] || '').includes('OT 1.5')) {
          const val = parseFloat(row[6])
          if (!isNaN(val)) result[curCode].ot15 = val
        } else if (curCode && String(row[5] || '').includes('OT2.0')) {
          const val = parseFloat(row[6])
          if (!isNaN(val)) result[curCode].ot20 = val
          curCode = null
        }
      }
    }
  }
  return result
}

// =============================================================================
// FILL OT CHECKING REPORT
// =============================================================================
function fillOtReport(
  reportB64: string,
  byCode: Record<string, TimeRecord[]>,
  resultMap: Record<string, Record<string, DayResult>>,
  ptSet: Set<string>,
  attData: Record<string, AttInfo>
): string {
  const wb = XLSX.read(reportB64, { type: 'base64', cellStyles: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return reportB64

  const allCodes = new Set([...Object.keys(byCode), ...Object.keys(attData)])
  let rowIdx = 1

  for (const code of Array.from(allCodes).sort()) {
    const recs = byCode[code]
    const empRes = resultMap[code] || {}
    const attInfo = attData[code]
    const isPt = ptSet.has(code)

    let tsOt15 = 0, tsOffOt = 0, tsPhOt = 0, tsOffAddl = 0, tsPhAddl = 0, hasUnclassified = false
    for (const [date, d] of Object.entries(empRes)) {
      tsOt15 += d.ot15
      const dt = getDayType(date)
      if (dt === 'SUN') { tsOffOt += d.ot20days; tsOffAddl += d.ot20hrs }
      if (dt === 'PH')  { tsPhOt  += d.ot20days; tsPhAddl  += d.ot20hrs }
      if (!d.shift && d.in && !d.isPt) hasUnclassified = true
    }

    const name = recs?.[0]?.name || attInfo?.name || ''
    const group = recs?.[0]?.group || attInfo?.location || ''

    setCell(ws, rowIdx, 0, code)
    setCell(ws, rowIdx, 1, name)
    setCell(ws, rowIdx, 3, group)
    setCell(ws, rowIdx, 4, recs ? tsOt15 : null)
    setCell(ws, rowIdx, 5, attInfo?.ot15 ?? null)
    setCell(ws, rowIdx, 6, recs ? tsOffOt : null)
    setCell(ws, rowIdx, 7, attInfo?.ot20 ?? null)
    setCell(ws, rowIdx, 8, recs ? tsPhOt : null)
    // Col 9: additional hours note
    if (recs && (tsOffAddl + tsPhAddl) > 0) setCell(ws, rowIdx, 9, `+${tsOffAddl + tsPhAddl}h addl`)

    let note = 'Verified OK'
    if (isPt) note = '[PART-TIME – NO OT]'
    else if (!recs) note = 'In Attendance only – missing from Time Sheet'
    else if (!attInfo) note = 'In Time Sheet only – missing from Attendance files'
    else if (hasUnclassified) note = 'Shift unclassified – manual review required'
    setCell(ws, rowIdx, 10, note)

    rowIdx++
  }

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================
export async function runSoftServicesEngine(
  timeSheetB64: string,
  attendanceB64s: string[],
  otReportB64: string
): Promise<SoftServicesOutput> {
  const errors: string[] = []

  try {
    // 1. Parse Time Sheet
    const { records, byCode } = parseTimeSheet(timeSheetB64)

    // 2. Auto-detect target month
    const targetYearMonth = detectTargetMonth(records) || '2026-04'

    // 3. Validate attendance sheets (GREEN/STALE)
    const sheetStatus = validateAttendanceSheets(attendanceB64s, targetYearMonth)

    // 4. Calculate OT
    const { ptSet, resultMap, totalOt15, totalOt20Days, totalOt20AdditionalHrs, unclassified } = calcOt(byCode)

    // 5. Extract Attendance data (for comparison/report)
    const attData = extractAttendanceData(attendanceB64s)

    // 6. Build outputs
    const attendanceBase64 = fillAttendance(attendanceB64s[0], resultMap, ptSet, targetYearMonth)
    let attendance2Base64: string | undefined
    if (attendanceB64s.length > 1 && attendanceB64s[1]) {
      attendance2Base64 = fillAttendance(attendanceB64s[1], resultMap, ptSet, targetYearMonth)
    }
    const reportBase64 = fillOtReport(otReportB64, byCode, resultMap, ptSet, attData)

    // 7. Stale sheet warning
    const staleSheets = sheetStatus.filter(s => s.status !== 'GREEN')
    if (staleSheets.length > 0) {
      errors.push(`${staleSheets.length} sheet(s) were STALE/PARTIAL and skipped. HR must re-file: ${staleSheets.map(s => s.sheet).join(', ')}`)
    }

    return {
      attendanceBase64,
      attendance2Base64,
      reportBase64,
      summary: {
        totalEmployees: Object.keys(byCode).length,
        totalPt: ptSet.size,
        unclassifiedShifts: unclassified,
        totalOt15,
        totalOt20Days,
        totalOt20AdditionalHrs,
        targetMonth: targetYearMonth,
      },
      sheetStatus,
      errors,
    }
  } catch (e: any) {
    errors.push(e.message)
    return {
      attendanceBase64: '',
      reportBase64: '',
      summary: { totalEmployees: 0, totalPt: 0, unclassifiedShifts: 0, totalOt15: 0, totalOt20Days: 0, totalOt20AdditionalHrs: 0, targetMonth: '' },
      sheetStatus: [],
      errors,
    }
  }
}
