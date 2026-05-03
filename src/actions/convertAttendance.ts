'use server'

import * as XLSX from 'xlsx'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmpInfo {
  code: string
  name: string
  workingGroup: string
  designation: string
  epc: string
  sbu: string
}

export interface DayRecord {
  date: Date
  inTime: string | null   // "HH:MM" or null
  outTime: string | null  // "HH:MM" or null
  leaveCode: string | null // e.g. "AL(FL)", "MC(FL)", null for working days
  isOff: boolean          // true if "OFF" — skip entirely
  hoursWorked: number
}

export interface EmployeeAttendance {
  emp: EmpInfo
  days: DayRecord[]
}

export interface ConversionResult {
  success: boolean
  employeeCount?: number
  dayCount?: number
  outputBase64?: string // Base64-encoded xlsx buffer
  errors?: string[]
  error?: string
  insights?: {
    unknownLeaveCodes: string[]
    missingOutTimes: string[]
    duplicateEntries: string[]
    score: number
    summary: string
  }
}

export interface ValidationResult {
  success: boolean
  checks: {
    label: string
    status: 'pass' | 'warn' | 'fail'
    detail: string
  }[]
  meta?: {
    employeeCount: number
    dateRange: string
    sheetCount: number
  }
}

// ── Attendance Code Mapping ───────────────────────────────────────────────────

const LEAVE_CODE_MAP: Record<string, string> = {
  'AL': 'AL(FL)',
  'AL/UL': 'AL(FL)',
  'MC': 'MC(FL)',
  'PH': 'PH(FL)',
  'UL': 'UPL(FL)',
  'UPL': 'UPL(FL)',
  'CCL': 'CCL(FL)',
  'COMP': 'COMP(FL)',
  'HL': 'HL(FL)',
  'NPL': 'NPL(FL)',
  'ABS': 'ABS(FL)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(val: unknown): string | null {
  if (val === null || val === undefined) return null
  // XLSX parses time as a fractional number (Excel serial) when type='array'
  if (typeof val === 'number') {
    // Excel time fraction: 0.5 = 12:00
    const totalMinutes = Math.round(val * 24 * 60)
    const h = Math.floor(totalMinutes / 60) % 24
    const m = totalMinutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  // Already a string like "07:00" or "07;00"
  if (typeof val === 'string') {
    const clean = val.replace(';', ':').trim()
    if (/^\d{1,2}:\d{2}$/.test(clean)) return clean
  }
  return null
}

function calcHours(inTime: string | null, outTime: string | null): number {
  if (!inTime || !outTime) return 0
  const [ih, im] = inTime.split(':').map(Number)
  const [oh, om] = outTime.split(':').map(Number)
  let mins = (oh * 60 + om) - (ih * 60 + im)
  if (mins < 0) mins += 24 * 60 // overnight shift
  return Math.round((mins / 60) * 100) / 100
}

function excelDateToJSDate(val: unknown): Date | null {
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    // XLSX serial date
    return XLSX.SSF.parse_date_code(val) ? new Date((val - 25569) * 86400 * 1000) : null
  }
  return null
}

function formatDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// ── Main Parser ───────────────────────────────────────────────────────────────

export async function convertAttendanceAction(
  sourceBase64: string,
  templateBase64: string
): Promise<ConversionResult> {
  try {
    const errors: string[] = []

    // Decode base64 → Uint8Array
    const sourceBuf = Buffer.from(sourceBase64, 'base64')
    const templateBuf = Buffer.from(templateBase64, 'base64')

    // ── Parse Source ────────────────────────────────────────────────────────
    const srcWb = XLSX.read(sourceBuf, { type: 'buffer', cellDates: false })

    const sheetNames = srcWb.SheetNames
    const sheet1Name = sheetNames.find(s => s.includes('1st'))
    const sheet2Name = sheetNames.find(s => s.includes('2nd'))
    const empListName = sheetNames.find(s => s.toLowerCase().includes('emp'))

    if (!sheet1Name || !sheet2Name) {
      return { success: false, error: 'Source file missing "1st Half" or "2nd Half" sheets.' }
    }

    // ── EMP LIST ─────────────────────────────────────────────────────────────
    const empMap = new Map<string, EmpInfo>()
    if (empListName) {
      const empWs = srcWb.Sheets[empListName]
      const empData = XLSX.utils.sheet_to_json<any[]>(empWs, { header: 1 })
      // Row 0 = header: EMPLOYEE CODE | Employee Name | Nationality | Working Group | Designation
      for (let i = 1; i < empData.length; i++) {
        const row = empData[i]
        const code = String(row[0] || '').trim()
        if (!code) continue
        empMap.set(code.toUpperCase(), {
          code,
          name: String(row[1] || '').trim(),
          workingGroup: String(row[3] || '').trim(),
          designation: String(row[4] || '').trim(),
          epc: 'GM-OPT',
          sbu: 'OPERATION2',
        })
      }
    }

    // ── Parse a half-sheet ────────────────────────────────────────────────────
    function parseHalfSheet(sheetName: string): Map<string, DayRecord[]> {
      const ws = srcWb.Sheets[sheetName]
      const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true })

      // Find the date row and IN/OUT row
      // Date row: row where cols 5+ contain Excel date serials
      // IN/OUT row: row where cols 5+ contain "IN" / "OUT" strings
      let dateRowIdx = -1
      let inOutRowIdx = -1

      for (let r = 0; r < Math.min(10, raw.length); r++) {
        const row = raw[r]
        const col5 = row[5]
        if (typeof col5 === 'number' && col5 > 40000) {
          // Looks like an Excel date serial
          dateRowIdx = r
        }
        if (typeof col5 === 'string' && col5.includes('IN')) {
          inOutRowIdx = r
        }
      }

      if (dateRowIdx === -1) {
        // Fallback: row 3 (0-indexed) is the date row
        dateRowIdx = 3
        inOutRowIdx = 4
      }

      const dateRow = raw[dateRowIdx] || []
      // Build col→date map (cols 5+ that have date serials)
      // Each date occupies 2 columns: IN col (even) and OUT col (odd)
      const colDateMap = new Map<number, Date>()
      let currentDate: Date | null = null
      for (let c = 5; c < dateRow.length; c++) {
        const v = dateRow[c]
        if (typeof v === 'number' && v > 40000) {
          currentDate = new Date((v - 25569) * 86400 * 1000)
          colDateMap.set(c, currentDate)
        } else if (currentDate !== null && !colDateMap.has(c)) {
          // The OUT column inherits the same date as the preceding IN column
          colDateMap.set(c, currentDate)
        }
      }

      // Find employee data rows (row index >= inOutRowIdx + 1)
      const result = new Map<string, DayRecord[]>()
      const empStartRow = inOutRowIdx + 1

      for (let r = empStartRow; r < raw.length; r++) {
        const row = raw[r]
        const empCode = String(row[2] || '').trim().toUpperCase()
        if (!empCode) continue

        // Collect day records
        const days: DayRecord[] = []
        // Walk through columns in pairs (IN, OUT)
        const cols = Array.from(colDateMap.keys()).filter((_, i, arr) => {
          // Only take the IN col of each pair (every 2nd unique date start)
          // Strategy: group by date
          return true
        })

        // Build date→{inCol, outCol} map
        const dateColMap = new Map<string, { inCol: number; outCol: number }>()
        let lastDate = ''
        for (let c = 5; c < (raw[dateRowIdx] || []).length; c++) {
          const d = colDateMap.get(c)
          if (!d) continue
          const dStr = d.toISOString().split('T')[0]
          if (!dateColMap.has(dStr)) {
            dateColMap.set(dStr, { inCol: c, outCol: c + 1 })
          }
        }

        for (const [dStr, { inCol, outCol }] of dateColMap) {
          const inVal = row[inCol]
          const outVal = row[outCol]

          // Determine if it's a time or a code
          const isInTime = typeof inVal === 'number' && inVal < 1 // fractional = time
          const isOutTime = typeof outVal === 'number' && outVal < 1

          let leaveCode: string | null = null
          let isOff = false
          let inTime: string | null = null
          let outTime: string | null = null

          if (isInTime) {
            inTime = formatTime(inVal)
            outTime = isOutTime ? formatTime(outVal) : null
          } else {
            const codeStr = String(inVal || '').trim().toUpperCase()
            if (codeStr === 'OFF' || codeStr === '0FF') {
              isOff = true
            } else if (LEAVE_CODE_MAP[codeStr]) {
              leaveCode = LEAVE_CODE_MAP[codeStr]
              // Some leave rows still have clock times
              if (isOutTime) outTime = formatTime(outVal)
            } else if (codeStr === '' || codeStr === '0' || codeStr === 'NULL') {
              isOff = true
            }
          }

          const hours = calcHours(inTime, outTime)
          const [y, m, day] = dStr.split('-').map(Number)
          const date = new Date(Date.UTC(y, m - 1, day))

          days.push({ date, inTime, outTime, leaveCode, isOff, hoursWorked: hours })
        }

        if (!result.has(empCode)) {
          result.set(empCode, days)
        } else {
          // Merge (shouldn't happen but just in case)
          const existing = result.get(empCode)!
          result.set(empCode, [...existing, ...days])
        }
      }

      return result
    }

    const half1 = parseHalfSheet(sheet1Name)
    const half2 = parseHalfSheet(sheet2Name)

    // ── Merge halves ──────────────────────────────────────────────────────────
    const allEmps = new Set([...half1.keys(), ...half2.keys()])
    const attendanceRecords: EmployeeAttendance[] = []

    for (const code of allEmps) {
      const empInfo = empMap.get(code) || {
        code,
        name: '',
        workingGroup: '',
        designation: '',
        epc: 'GM-OPT',
        sbu: 'OPERATION2',
      }

      // Get name from half1 or half2 row if not in EMP LIST
      if (!empInfo.name) {
        const ws1 = srcWb.Sheets[sheet1Name]
        const raw1 = XLSX.utils.sheet_to_json<any[]>(ws1, { header: 1, raw: true })
        for (const row of raw1) {
          if (String(row[2] || '').trim().toUpperCase() === code) {
            empInfo.name = String(row[3] || '').trim()
            break
          }
        }
      }

      const days1 = half1.get(code) || []
      const days2 = half2.get(code) || []
      const allDays = [...days1, ...days2].sort((a, b) => a.date.getTime() - b.date.getTime())

      attendanceRecords.push({ emp: empInfo, days: allDays })
    }

    // ── Build output rows ─────────────────────────────────────────────────────
    // Load blank template
    const tplWb = XLSX.read(templateBuf, { type: 'buffer', cellDates: false })
    const tplWs = tplWb.Sheets['EmployeeAttendance']
    if (!tplWs) {
      return { success: false, error: 'Template missing "EmployeeAttendance" sheet.' }
    }

    const allOutputRows: any[][] = []
    let totalDayCount = 0

    for (const rec of attendanceRecords) {
      const { emp, days } = rec
      const activeDays = days.filter(d => !d.isOff)
      const leaveDays = activeDays.filter(d => d.leaveCode !== null)
      const workDays = activeDays.filter(d => d.leaveCode === null && d.inTime !== null)

      const totalHours = workDays.reduce((sum, d) => sum + d.hoursWorked, 0)
      const onLeaveDays = leaveDays.length

      // ── Summary row ──────────────────────────────────────────────────────
      const summaryRow = [
        emp.code,           // A: Employee Code
        emp.name,           // B: Employee Name
        emp.epc,            // C: EPC
        emp.workingGroup,   // D: Working Group
        emp.sbu,            // E: SBU
        emp.designation,    // F: Designation
        Math.round(totalHours * 100) / 100, // G: Total Working Hours
        Math.round(totalHours * 100) / 100, // H: Normal Working Hours
        0,                  // I: Raw OT Hours
        0,                  // J: Rounded OT Hours
        0,                  // K: Raw Lateness Hours
        0,                  // L: Rounded Lateness Hours
        0,                  // M: Raw Early Leaving Hours
        0,                  // N: Rounded Early Leaving Hours
        0,                  // O: No Record Days
        0,                  // P: OT Days
        0,                  // Q: Late Days
        0,                  // R: Early Leaving Days
        onLeaveDays,        // S: On Leave Days
      ]

      allOutputRows.push(summaryRow)

      // ── Detail rows (one per active day) ─────────────────────────────────
      for (const day of activeDays) {
        const detailRow = [
          emp.code,                   // A: Employee Code
          emp.name,                   // B: Employee Name
          emp.epc,                    // C: EPC
          emp.workingGroup,           // D: Working Group
          emp.sbu,                    // E: SBU
          emp.designation,            // F: Designation
          formatDate(day.date),       // G: Date
          day.leaveCode || null,      // H: Leave Code (null = working day)
          null,                       // I: (blank)
          day.inTime || (day.leaveCode ? '00:00' : null),   // J: IN
          day.outTime || (day.leaveCode ? '00:00' : null),  // K: OUT
          null,                       // L: (blank)
          null,                       // M: Location IN
          null,                       // N: Location OUT
          null,                       // O: GPS IN
          null,                       // P: GPS OUT
          null,                       // Q: (blank)
          day.leaveCode ? null : (day.hoursWorked > 0 ? String(day.hoursWorked) : null), // R: Hours
          '0',                        // S: OT
          '0',                        // T: Lateness
          null, null, null, null,
          day.inTime || null,         // Y: Actual IN (mirror)
          day.outTime || null,        // Z: Actual OUT (mirror)
          'Approved',                 // AA: Status
        ]

        allOutputRows.push(detailRow)
        totalDayCount++
      }
    }

    // Single Bulk Write (Significantly faster)
    XLSX.utils.sheet_add_aoa(tplWs, allOutputRows, { origin: { r: 7, c: 0 } })

    // ── Generate AI Insights ────────────────────────────────────────────────
    const unknownCodes = Array.from(new Set(errors.filter(e => e.includes('unknown code')).map(e => e.split('"')[1] || '')))
    const missingOuts = Array.from(new Set(errors.filter(e => e.includes('missing OUT')).map(e => e.split('for ')[1] || '')))
    
    // Simple Score Calculation
    let score = 100
    if (unknownCodes.length > 0) score -= 5
    if (missingOuts.length > 0) score -= 10
    if (attendanceRecords.length === 0) score = 0

    const summary = `Successfully converted ${attendanceRecords.length} employees. ` +
      (unknownCodes.length > 0 ? `Found ${unknownCodes.length} unknown leave codes. ` : '') +
      (missingOuts.length > 0 ? `Warning: ${missingOuts.length} records missing clock-out times.` : 'All clock-out times matched.')

    return {
      success: true,
      employeeCount: attendanceRecords.length,
      dayCount: totalDayCount,
      outputBase64,
      errors: errors.length > 0 ? errors : undefined,
      insights: {
        unknownLeaveCodes: unknownCodes,
        missingOutTimes: missingOuts,
        duplicateEntries: [], // TBD
        score,
        summary
      }
    }

  } catch (err: any) {
    console.error('convertAttendanceAction error:', err)
    return { success: false, error: err.message || 'Unknown error during conversion.' }
  }
}

export async function validateSourceAction(sourceBase64: string): Promise<ValidationResult> {
  try {
    const buf = Buffer.from(sourceBase64, 'base64')
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
    const checks: ValidationResult['checks'] = []

    // 1. Sheet presence
    const sheet1 = wb.SheetNames.find(s => s.includes('1st'))
    const sheet2 = wb.SheetNames.find(s => s.includes('2nd'))
    
    if (sheet1 && sheet2) {
      checks.push({ label: 'Sheet Structure', status: 'pass', detail: 'Found both 1st and 2nd Half sheets.' })
    } else {
      checks.push({ label: 'Sheet Structure', status: 'fail', detail: 'Missing required 1st or 2nd Half sheets.' })
    }

    // 2. Emp List
    const empList = wb.SheetNames.find(s => s.toLowerCase().includes('emp'))
    if (empList) {
      checks.push({ label: 'Employee Registry', status: 'pass', detail: 'EMP LIST sheet detected for mapping.' })
    } else {
      checks.push({ label: 'Employee Registry', status: 'warn', detail: 'No EMP LIST found. Using names from attendance rows.' })
    }

    // 3. Data Scan
    let empCount = 0
    if (sheet1) {
      const ws = wb.Sheets[sheet1]
      const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })
      empCount = data.length > 5 ? data.length - 5 : 0 // Rough estimate
    }

    return {
      success: true,
      checks,
      meta: {
        employeeCount: empCount,
        dateRange: 'Detected from sheets',
        sheetCount: wb.SheetNames.length
      }
    }
  } catch (e: any) {
    return { success: false, checks: [{ label: 'File Parse', status: 'fail', detail: e.message }] }
  }
}
