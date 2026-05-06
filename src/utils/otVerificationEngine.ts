// OT Verification Engine — TypeScript port of ot_verification.py
// Runs entirely in the browser (no server required)
import * as XLSX from 'xlsx'

// ─── Constants ───────────────────────────────────────────────────────────────
export const RATE_NORMAL = 25
export const RATE_DRIVER = 15
export const NIGHT_OT_CUTOFF = 2 * 60   // 02:00 in minutes
export const NEXT_DAY_CUTOFF = 10 * 60  // 10:00 in minutes
export const PUBLIC_HOLIDAYS = ['2026-04-03'] // Good Friday
export const COMPANIES = ['PNHR', 'PFS', 'GM']

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TimeRecord {
  empCode: string
  date: string         // YYYY-MM-DD
  timeIn: number | null   // minutes since midnight
  timeOut: number | null
  normalHours: number
  isOvernight: boolean
  timeOutDate: string  // YYYY-MM-DD
}

export interface EmpInfo {
  name: string
  designation: string
  company: string
  isDriver: boolean
}

export interface ClaimRow {
  sNo: number | null
  name: string
  empCode: string
  fin: string | null
  date: string         // YYYY-MM-DD
  isDriver: boolean
  type: 'DST' | 'MINOR'
  origDays: number
  origAmount: number
}

export interface EligibilityResult {
  eligible: boolean
  allowance: number
  nightIn: string | null
  nightOut: string | null
  nightCheck: string
  dayShiftCheck: string
  nextDayCheck: string
  nextDayIn: string | null
  remark: string
  empCode: string
  evidenceUrl?: string
}

export interface ImageMetadata {
  fileName: string
  url: string
  matchedName: string
  matchedDate: string // YYYY-MM-DD
}

export interface ConflictRow {
  empCode: string; name: string; date: string
  dstClaimed: number; minorClaimed: number
  resolution: string; finalAllowance: string
}

export interface ExceptionRow {
  empCode: string; name: string; date: string
  issueType: string; detail: string; recommendedAction: string
}

export interface VerificationResult {
  outputBase64: string
  summary: {
    totalEmployees: number
    totalClaimedDays: number
    totalEligibleDays: number
    totalDiscrepancyDays: number
    totalOriginalAmount: number
    totalCalculatedAmount: number
    netDifference: number
    conflictCount: number
    exceptionCount: number
    splitClockingCount: number
    after5amCount: number
  }
  errors: string[]
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function parseTimeToMinutes(t: any): number | null {
  if (t == null || t === '') return null
  const s = String(t).trim()
  const m = s.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2])
}

function minutesToStr(m: number | null): string | null {
  if (m == null) return null
  const h = Math.floor(m / 60) % 24
  const min = m % 60
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`
}

function excelDateToYMD(v: any): string | null {
  if (v == null) return null
  const s = String(v).trim()
  // DD/MM/YYYY
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // Excel serial number
  if (!isNaN(Number(v))) {
    const d = XLSX.SSF.parse_date_code(Number(v))
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  return null
}

function addDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function isDriver(name: any, designation: any): boolean {
  const n = String(name ?? '').toUpperCase()
  const d = String(designation ?? '').toUpperCase()
  return d.includes('DRIVER') || n.includes('(DRIVER)') || n.includes(' DRIVER')
}

function normalizeCode(code: any): string {
  if (code == null) return ''
  let c = String(code).trim().toUpperCase()
  if (c.startsWith('GO') && !c.startsWith('GOO')) c = 'G0' + c.slice(2)
  return c
}

// Simple Levenshtein similarity (0-100)
function similarity(a: string, b: string): number {
  a = a.toUpperCase(); b = b.toUpperCase()
  const dp = Array.from({length: a.length + 1}, (_, i) =>
    Array.from({length: b.length + 1}, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  const maxLen = Math.max(a.length, b.length)
  return maxLen === 0 ? 100 : Math.round((1 - dp[a.length][b.length] / maxLen) * 100)
}

// ─── Phase 2: Load Attendance ─────────────────────────────────────────────────
export function parseAttendance(base64: string): {
  attendanceDict: Record<string, Record<string, Record<string, TimeRecord[]>>>
  empInfo: Record<string, EmpInfo>
} {
  const wb = XLSX.read(base64, { type: 'base64' })
  const attendanceDict: Record<string, Record<string, Record<string, TimeRecord[]>>> = {}
  const empInfo: Record<string, EmpInfo> = {}

  for (const company of COMPANIES) {
    attendanceDict[company] = {}
    if (!wb.SheetNames.includes(company)) continue
    const ws = wb.Sheets[company]
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]

    // Find "Details" marker row
    let detailIdx = -1
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0] ?? '').trim() === 'Details') { detailIdx = i; break }
    }
    if (detailIdx === -1) continue

    const headers: string[] = rows[detailIdx + 1].map((h: any) => String(h ?? '').trim())
    const col = (name: string) => headers.indexOf(name)

    for (let i = detailIdx + 2; i < rows.length; i++) {
      const row = rows[i]
      const code = normalizeCode(row[col('Employee Code')])
      if (!code) continue
      const dateStr = excelDateToYMD(row[col('Date')])
      if (!dateStr) continue

      let tIn = parseTimeToMinutes(row[col('Time In')])
      let tOut = parseTimeToMinutes(row[col('Time Out')])
      const normalHours = parseFloat(String(row[col('Normal Hours')] ?? '0')) || 0
      const isOvn = tIn != null && tOut != null && tOut < tIn
      const tOutDate = isOvn ? addDay(dateStr) : dateStr

      const rec: TimeRecord = { empCode: code, date: dateStr, timeIn: tIn, timeOut: tOut, normalHours, isOvernight: isOvn, timeOutDate: tOutDate }

      if (!attendanceDict[company][code]) attendanceDict[company][code] = {}
      if (!attendanceDict[company][code][dateStr]) attendanceDict[company][code][dateStr] = []
      attendanceDict[company][code][dateStr].push(rec)

      if (!empInfo[code]) {
        empInfo[code] = {
          name: String(row[col('Employee Name')] ?? '').trim(),
          designation: String(row[col('Designation')] ?? '').trim(),
          company,
          isDriver: isDriver(row[col('Employee Name')], row[col('Designation')])
        }
      }
    }
  }

  return { attendanceDict, empInfo }
}

// ─── Phase 3: Load Claims ────────────────────────────────────────────────────
export function parseClaimNamelist(base64: string, sheetName: string, type: 'DST' | 'MINOR'): ClaimRow[] {
  const wb = XLSX.read(base64, { type: 'base64' })
  if (!wb.SheetNames.includes(sheetName)) return []
  const ws = wb.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]

  // Row index 3 (0-based) = header row
  const header = rows[3] ?? []
  // Find day columns (1-31) by value — take first occurrence only
  const dayColMap: Record<number, number> = {}
  header.forEach((v: any, idx: number) => {
    const n = Number(v)
    if (Number.isInteger(n) && n >= 1 && n <= 31 && !(n in dayColMap)) {
      dayColMap[n] = idx
    }
  })

  // Find DAYS / AMOUNT col indices
  const daysColIdx = header.findIndex((h: any) => String(h ?? '').trim().toUpperCase() === 'DAYS')
  const amtColIdx = header.findIndex((h: any) => String(h ?? '').trim().toUpperCase() === 'AMOUNT')

  const claims: ClaimRow[] = []
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i]
    const rawName = row[1]
    if (!rawName) continue
    const name = String(rawName).trim()
    const code = normalizeCode(row[2])
    const fin = row[3] ? String(row[3]).trim() : null
    const driver = isDriver(name, '')
    const origDays = daysColIdx >= 0 ? (Number(row[daysColIdx]) || 0) : 0
    const origAmount = amtColIdx >= 0 ? (Number(row[amtColIdx]) || 0) : 0

    for (const [dayStr, colIdx] of Object.entries(dayColMap)) {
      const val = row[colIdx]
      if (val === 1 || String(val).trim() === '1') {
        const day = parseInt(dayStr)
        // April 2026 — if day > 30, skip (April has 30 days)
        if (day > 30) continue
        const dateStr = `2026-04-${String(day).padStart(2, '0')}`
        claims.push({ sNo: row[0] ?? null, name, empCode: code, fin, date: dateStr, isDriver: driver, type, origDays, origAmount })
      }
    }
  }
  return claims
}

// ─── Phase 4: Resolve Conflicts ───────────────────────────────────────────────
export function resolveConflicts(dst: ClaimRow[], minor: ClaimRow[]): {
  cleanedMinor: ClaimRow[]; conflictLog: ConflictRow[]
} {
  const dstSet = new Set(dst.map(r => `${r.empCode}|${r.date}`))
  const conflictLog: ConflictRow[] = []
  const cleanedMinor: ClaimRow[] = []

  for (const row of minor) {
    const key = `${row.empCode}|${row.date}`
    if (dstSet.has(key)) {
      conflictLog.push({ empCode: row.empCode, name: row.name, date: row.date, dstClaimed: 1, minorClaimed: 1, resolution: 'DST Priority', finalAllowance: 'DST' })
    } else {
      cleanedMinor.push(row)
    }
  }
  return { cleanedMinor, conflictLog }
}

// ─── Phase 5: Check Eligibility ───────────────────────────────────────────────
export function checkEligibility(
  empCode: string,
  empName: string,
  claimDate: string,
  attendanceDict: Record<string, Record<string, Record<string, TimeRecord[]>>>,
  empInfo: Record<string, EmpInfo>,
  evidenceList: ImageMetadata[] = []
): EligibilityResult {
  let info = empInfo[empCode]

  // Fuzzy name match if code missing
  if (!info && empName) {
    let bestScore = 0; let bestCode = ''
    for (const [code, ei] of Object.entries(empInfo)) {
      const score = similarity(empName, ei.name)
      if (score > bestScore) { bestScore = score; bestCode = code }
    }
    if (bestScore >= 85) { info = empInfo[bestCode]; empCode = bestCode }
  }

  if (!info) {
    return { eligible: false, allowance: 0, nightIn: null, nightOut: null, nightCheck: 'FAIL', dayShiftCheck: 'FAIL', nextDayCheck: 'FAIL', nextDayIn: null, remark: 'No timesheet record found', empCode }
  }

  // Look for matching evidence
  const evidence = evidenceList.find(img => {
    const nameMatch = similarity(info.name, img.matchedName) >= 85
    return nameMatch && img.matchedDate === claimDate
  })

  const comp = info.company
  const nextDate = addDay(claimDate)
  const recs_n = attendanceDict[comp]?.[empCode]?.[claimDate] ?? []
  const recs_n1 = attendanceDict[comp]?.[empCode]?.[nextDate] ?? []

  // ── Condition B: Day Shift
  const dow = new Date(claimDate + 'T00:00:00Z').getUTCDay() // 0=Sun
  let dayShiftCheck = 'FAIL'
  if (dow === 0) {
    dayShiftCheck = 'SUNDAY EXEMPT'
  } else {
    for (const r of recs_n) {
      if (r.timeIn != null && r.timeIn < 14 * 60 && r.normalHours >= 4.0) {
        dayShiftCheck = 'PASS'; break
      }
    }
  }

  // ── Condition A: Night OT
  let nightCheck = 'FAIL'
  let nightIn: string | null = null
  let nightOut: string | null = null
  let remark = ''

  // Path 1 — single overnight record
  for (const r of recs_n) {
    if (r.isOvernight && r.timeIn != null && r.timeIn >= 18 * 60 && r.timeOut != null && r.timeOutDate === nextDate) {
      if (r.timeOut >= NIGHT_OT_CUTOFF) {
        nightCheck = 'PASS'
        nightIn = minutesToStr(r.timeIn)
        nightOut = minutesToStr(r.timeOut)
        if (r.timeOut >= 5 * 60) remark = 'After 5AM'
        break
      } else {
        remark = 'Night OT < 02:00'
      }
    }
  }

  // Path 2 — split clocking
  if (nightCheck === 'FAIL') {
    const rec1 = recs_n.find(r => r.timeOut != null && r.timeOut >= 23 * 60)
    if (rec1) {
      const rec2 = recs_n1.find(r => r.timeIn != null && r.timeIn <= 5 * 60 && r.timeOut != null && r.timeOut >= NIGHT_OT_CUTOFF + 1)
      if (rec2) {
        nightCheck = 'PASS'
        nightIn = minutesToStr(rec1.timeIn ?? null)
        nightOut = minutesToStr(rec2.timeOut ?? null)
        remark = 'Split Clocking'
      }
    }
  }

  // ── Condition C: Next Day Attendance ≤ 10:00
  let nextDayCheck = 'FAIL'
  let nextDayIn: string | null = null
  for (const r of recs_n1) {
    if (r.timeIn != null && r.timeIn >= 6 * 60 && r.timeIn <= NEXT_DAY_CUTOFF) {
      nextDayCheck = 'PASS'
      nextDayIn = minutesToStr(r.timeIn)
      break
    }
  }

  // Public holiday flag
  if (PUBLIC_HOLIDAYS.includes(claimDate)) remark += (remark ? ' ' : '') + '[Public Holiday – Manual Review]'

  const eligible = (dayShiftCheck === 'PASS' || dayShiftCheck === 'SUNDAY EXEMPT') && nightCheck === 'PASS' && nextDayCheck === 'PASS'
  const allowance = eligible ? (info.isDriver ? RATE_DRIVER : RATE_NORMAL) : 0

  if (!remark) {
    if (dayShiftCheck === 'FAIL') remark = 'No day shift'
    else if (nightCheck === 'FAIL') remark = 'Night OT < 02:00'
    else if (nextDayCheck === 'FAIL') remark = 'No next-day attendance'
  }

  return { eligible, allowance, nightIn, nightOut, nightCheck, dayShiftCheck, nextDayCheck, nextDayIn, remark, empCode, evidenceUrl: evidence?.url }
}

// ─── Phase 6 & 7: Build + Write Excel Output ──────────────────────────────────
export function buildAndWriteOutput(
  allClaims: (ClaimRow & { result: EligibilityResult })[],
  conflictLog: ConflictRow[],
  exceptionLog: ExceptionRow[],
  templateBase64: string,
  empInfo: Record<string, EmpInfo>
): string {
  // We'll use vanilla xlsx (already installed) for writing; xlsx-js-style for fills
  // Build fresh workbook from template
  const wb = XLSX.read(templateBase64, { type: 'base64' })

  // ── Sheet 1: DST OT-NAMELIST
  const ws1 = wb.Sheets['DST OT-NAMELIST']
  if (ws1) {
    const dstClaims = allClaims.filter(c => c.type === 'DST')
    const byEmp = new Map<string, typeof dstClaims>()
    for (const c of dstClaims) {
      const k = c.result.empCode || c.empCode
      if (!byEmp.has(k)) byEmp.set(k, [])
      byEmp.get(k)!.push(c)
    }

    let rowIdx = 5 // 1-based, data starts row 5
    let sno = 1
    for (const [code, rows] of byEmp) {
      const first = rows[0]
      const info = empInfo[code]
      XLSX.utils.sheet_add_aoa(ws1, [[
        sno++,
        first.name,
        code,
        first.fin,
        ...Array.from({length: 30}, (_, d) => {
          const dateStr = `2026-04-${String(d + 1).padStart(2, '0')}`
          return rows.find(r => r.date === dateStr && r.result.eligible) ? 1 : null
        }),
        rows.filter(r => r.result.eligible).length,
        rows.filter(r => r.result.eligible).reduce((s, r) => s + r.result.allowance, 0),
        info?.company ?? ''
      ]], { origin: { r: rowIdx - 1, c: 0 } })
      rowIdx++
    }
  }

  // ── Sheet 2: OT_ALLOWANCE_SUMMARY
  const ws2 = wb.Sheets['OT_ALLOWANCE_SUMMARY'] ?? XLSX.utils.aoa_to_sheet([['S.No','Emp Code','Name','Company','Type','Original Days','Calculated Days','Day Difference','Original Amount','Calculated Amount','Amount Difference']])
  if (!wb.Sheets['OT_ALLOWANCE_SUMMARY']) wb.Sheets['OT_ALLOWANCE_SUMMARY'] = ws2

  const empSet = new Map<string, (ClaimRow & { result: EligibilityResult })[]>()
  for (const c of allClaims) {
    const k = c.result.empCode || c.empCode
    if (!empSet.has(k)) empSet.set(k, [])
    empSet.get(k)!.push(c)
  }

  const summaryRows: any[][] = []
  let sno2 = 1
  for (const [code, rows] of empSet) {
    const first = rows[0]
    const info = empInfo[code]
    const calcDays = rows.filter(r => r.result.eligible).length
    const calcAmt = rows.filter(r => r.result.eligible).reduce((s, r) => s + r.result.allowance, 0)
    const origDays = first.origDays
    const origAmt = first.origAmount
    summaryRows.push([sno2++, code, first.name, info?.company ?? '', info?.isDriver ? 'Driver' : 'Normal', origDays, calcDays, calcDays - origDays, origAmt, calcAmt, calcAmt - origAmt])
  }
  XLSX.utils.sheet_add_aoa(ws2, summaryRows, { origin: 'A2' })

  // ── Sheet 3: OT_DETAIL_CHECK
  const ws3 = wb.Sheets['OT_DETAIL_CHECK'] ?? XLSX.utils.aoa_to_sheet([['S.No','Emp Code','Name','Company','Type','Date','Day','Original','Calculated','Allowance','Night Time In','Night Time Out','Night Check','Same-Day Day Shift','Next Day Record','Next Day Earliest In','Remark','Difference', 'Photo Evidence']])
  if (!wb.Sheets['OT_DETAIL_CHECK']) wb.Sheets['OT_DETAIL_CHECK'] = ws3

  const detailRows: any[][] = allClaims.map((c, i) => {
    const info = empInfo[c.result.empCode || c.empCode]
    const d = new Date(c.date + 'T00:00:00Z')
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    return [
      i + 1, c.result.empCode || c.empCode, c.name, info?.company ?? '', info?.isDriver ? 'Driver' : 'Normal',
      c.date, days[d.getUTCDay()], 1, c.result.eligible ? 1 : 0, c.result.allowance,
      c.result.nightIn, c.result.nightOut, c.result.nightCheck, c.result.dayShiftCheck,
      c.result.nextDayCheck, c.result.nextDayIn, c.result.remark, (c.result.eligible ? 1 : 0) - 1,
      c.result.evidenceUrl ? { t: 's', v: 'View Photo', l: { Target: c.result.evidenceUrl, Tooltip: 'Click to view photo evidence' } } : 'No Photo'
    ]
  })
  XLSX.utils.sheet_add_aoa(ws3, detailRows, { origin: 'A2' })

  // ── Sheet 4: CONFLICT_REPORT
  if (!wb.Sheets['CONFLICT_REPORT']) {
    wb.Sheets['CONFLICT_REPORT'] = XLSX.utils.aoa_to_sheet([])
    wb.SheetNames.push('CONFLICT_REPORT')
  }
  const conflictData = [['Emp Code','Name','Date','DST Claimed','MINOR Claimed','Resolution','Final Allowance'],
    ...conflictLog.map(c => [c.empCode, c.name, c.date, c.dstClaimed, c.minorClaimed, c.resolution, c.finalAllowance])]
  wb.Sheets['CONFLICT_REPORT'] = XLSX.utils.aoa_to_sheet(conflictData)

  // ── Sheet 5: EXCEPTION_REPORT
  if (!wb.Sheets['EXCEPTION_REPORT']) {
    wb.Sheets['EXCEPTION_REPORT'] = XLSX.utils.aoa_to_sheet([])
    wb.SheetNames.push('EXCEPTION_REPORT')
  }
  const excData = [['Emp Code','Name','Date','Issue Type','Detail','Recommended Action'],
    ...exceptionLog.map(e => [e.empCode, e.name, e.date, e.issueType, e.detail, e.recommendedAction])]
  wb.Sheets['EXCEPTION_REPORT'] = XLSX.utils.aoa_to_sheet(excData)

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
}

// ─── Top-level runner ─────────────────────────────────────────────────────────
export async function runOtVerification(
  attendanceB64: string,
  claimsB64: string,
  templateB64: string,
  evidencePhotos: { fileName: string; url: string; matchedName: string; matchedDate: string }[] = []
): Promise<VerificationResult> {
  const errors: string[] = []

  // Parse
  const { attendanceDict, empInfo } = parseAttendance(attendanceB64)
  const dstClaims = parseClaimNamelist(claimsB64, 'DST-OT-NAMELIST', 'DST')
  const minorClaims = parseClaimNamelist(claimsB64, 'MINOR-OT-NAMELIST', 'MINOR')

  // Conflicts
  const { cleanedMinor, conflictLog } = resolveConflicts(dstClaims, minorClaims)
  const allClaims = [...dstClaims, ...cleanedMinor]

  // Eligibility
  const exceptionLog: ExceptionRow[] = []
  let splitClockingCount = 0
  let after5amCount = 0

  const enriched = allClaims.map(claim => {
    try {
      const result = checkEligibility(claim.empCode, claim.name, claim.date, attendanceDict, empInfo, evidencePhotos)
      if (result.remark.includes('Split Clocking')) splitClockingCount++
      if (result.remark.includes('After 5AM')) after5amCount++
      if (result.remark.includes('No timesheet record found')) {
        exceptionLog.push({ empCode: result.empCode, name: claim.name, date: claim.date, issueType: 'Missing Timesheet', detail: 'Not found in any attendance sheet', recommendedAction: 'Check HR records manually' })
      }
      return { ...claim, result }
    } catch (e: any) {
      errors.push(`[${claim.empCode}] ${claim.date}: ${e.message}`)
      const failResult: EligibilityResult = { eligible: false, allowance: 0, nightIn: null, nightOut: null, nightCheck: 'FAIL', dayShiftCheck: 'FAIL', nextDayCheck: 'FAIL', nextDayIn: null, remark: e.message, empCode: claim.empCode }
      return { ...claim, result: failResult }
    }
  })

  // Summary stats
  const empSet = new Set(enriched.map(c => c.result.empCode || c.empCode))
  const totalEligible = enriched.filter(c => c.result.eligible).length
  const totalOrigAmt = [...new Map(enriched.map(c => [c.result.empCode || c.empCode, c])).values()].reduce((s, c) => s + c.origAmount, 0)
  const totalCalcAmt = enriched.reduce((s, c) => s + c.result.allowance, 0)

  const outputBase64 = buildAndWriteOutput(enriched, conflictLog, exceptionLog, templateB64, empInfo)

  return {
    outputBase64,
    summary: {
      totalEmployees: empSet.size,
      totalClaimedDays: enriched.length,
      totalEligibleDays: totalEligible,
      totalDiscrepancyDays: Math.abs(enriched.length - totalEligible),
      totalOriginalAmount: totalOrigAmt,
      totalCalculatedAmount: totalCalcAmt,
      netDifference: totalCalcAmt - totalOrigAmt,
      conflictCount: conflictLog.length,
      exceptionCount: exceptionLog.length,
      splitClockingCount,
      after5amCount
    },
    errors
  }
}
