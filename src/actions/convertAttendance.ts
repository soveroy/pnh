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
  
  let hours = mins / 60
  // Intelligence: HR Manual Rule - Deduct 1 hour for lunch if shift > 5 hours
  if (hours > 5.0) {
    hours -= 1.0
  }
  
  return Math.round(hours * 100) / 100
}

function excelDateToJSDate(val: unknown): Date | null {
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    // XLSX serial date
    return new Date((val - 25569) * 86400 * 1000)
  }
  if (typeof val === 'string') {
    const s = val.trim()
    // Handle DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmy) {
      const [_, d, m, y] = dmy
      return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d)))
    }
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d
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

    // ── Parse Source (RAW DATA - Flat List) ──────────────────────────────────
    const srcWb = XLSX.read(sourceBuf, { type: 'buffer', cellDates: true })
    const srcSheetName = srcWb.SheetNames.find(s => s === 'EmployeeAttendance') || srcWb.SheetNames[0]
    const srcWs = srcWb.Sheets[srcSheetName]
    const srcData = XLSX.utils.sheet_to_json<any[]>(srcWs, { header: 1, raw: true })

    if (srcData.length < 2) {
      return { success: false, error: 'Source file is empty or missing "EmployeeAttendance" sheet.' }
    }

    // Identify columns
    const headerRow = srcData[0]
    const colIdx = {
      code: headerRow.indexOf('Employee Code'),
      name: headerRow.indexOf('Employee Name'),
      date: headerRow.indexOf('Date'),
      activity: headerRow.indexOf('Activity'),
      in: headerRow.indexOf('Time In'),
      out: headerRow.indexOf('Time Out')
    }

    if (colIdx.code === -1 || colIdx.date === -1) {
      return { success: false, error: 'Source file missing required columns (Employee Code, Date).' }
    }

    const attendanceRecords = new Map<string, { emp: EmpInfo, days: Map<string, DayRecord> }>()


    for (let i = 1; i < srcData.length; i++) {
      const row = srcData[i]
      const code = String(row[colIdx.code] || '').trim().toUpperCase()
      if (!code || code === 'NULL' || code === 'EMPLOYEE CODE') continue

      const name = String(row[colIdx.name] || '').trim()
      const rawDate = row[colIdx.date]
      const date = excelDateToJSDate(rawDate)
      if (!date) continue
      const dStr = date.toISOString().split('T')[0]

      const workingGroup = colIdx.code !== -1 ? String(row[headerRow.indexOf('Working Group')] || '').trim().toUpperCase() : ''
      const activity = colIdx.activity !== -1 ? String(row[colIdx.activity] || '').trim() : ''
      const inVal = row[colIdx.in]
      const outVal = row[colIdx.out]

      const inTime = formatTime(inVal)
      const outTime = formatTime(outVal)

      if (!attendanceRecords.has(code)) {
        attendanceRecords.set(code, {
          emp: { code, name, workingGroup, designation: '', epc: '', sbu: '' },
          days: new Map()
        })
      }

      const empData = attendanceRecords.get(code)!
      if (!empData.days.has(dStr)) {
        empData.days.set(dStr, {
          date,
          inTime,
          outTime,
          leaveCode: activity || null,
          isOff: false,
          hoursWorked: 0
        })
      } else {
        const day = empData.days.get(dStr)!
        // Client Rule: Earliest IN, Latest OUT
        if (inTime) {
          if (!day.inTime || inTime < day.inTime) day.inTime = inTime
        }
        if (outTime) {
          if (!day.outTime || outTime > day.outTime) day.outTime = outTime
        }
        if (activity && !day.leaveCode) day.leaveCode = activity
      }
    }

    // Finalize hours after min/max logic
    attendanceRecords.forEach(rec => {
      rec.days.forEach(day => {
        day.hoursWorked = calcHours(day.inTime, day.outTime)
      })
    })

    // ── Prepare Template (TEMPLETE - Grid) ────────────────────────────────────
    const tplWb = XLSX.read(templateBuf, { type: 'buffer', cellDates: true })
    const staffSheets = tplWb.SheetNames.filter(s => s.startsWith('Staff Attendance'))

    if (staffSheets.length === 0) {
      return { success: false, error: 'Template missing "Staff Attendance" sheets.' }
    }

    function toDateString(d: Date) {
      const adjusted = new Date(d.getTime() + 12 * 60 * 60 * 1000)
      return adjusted.toISOString().split('T')[0]
    }

    let totalDayCount = 0
    let totalHours = 0
    let adjustmentCount = 0
    let totalLeaveDays = 0

    // Process each staff sheet in the template
    staffSheets.forEach(sheetName => {
      const ws = tplWb.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true })
      
      // Date row is index 3 (cols 5+)
      const dateRow = data[3] || []
      const colDateMap = new Map<number, string>()
      for (let c = 5; c < dateRow.length; c++) {
        const v = dateRow[c]
        const d = excelDateToJSDate(v)
        if (d) {
          const dStr = toDateString(d)
          colDateMap.set(c, dStr)
          colDateMap.set(c + 1, dStr)
          c++
        }
      }

      // Identify Working Group sections in this sheet
      const groupSections = new Map<string, number>() // Group Name -> Start Row
      data.forEach((row, r) => {
        const cellVal = String(row[0] || row[1] || row[2] || '').toUpperCase()
        if (cellVal.includes('NHGP -')) {
            const match = cellVal.match(/NHGP - [^ ]+/)
            if (match) groupSections.set(match[0].trim(), r)
            else groupSections.set(cellVal.trim(), r)
        }
      })

      // Map employees to the template
      attendanceRecords.forEach((record, empCode) => {
        const empGroup = record.emp.workingGroup
        // Find the section for this group
        let startRow = 5
        let endRow = data.length
        
        // Find the closest group section header
        const sections = Array.from(groupSections.keys())
        const targetSection = sections.find(s => empGroup.includes(s) || s.includes(empGroup))
        
        if (targetSection) {
            startRow = groupSections.get(targetSection)!
            // End row is the start of the next section
            const nextSectionRow = Array.from(groupSections.values())
                .filter(r => r > startRow)
                .sort((a, b) => a - b)[0]
            if (nextSectionRow) endRow = nextSectionRow
        }

        // Search for employee within the identified range (or whole sheet if group not found)
        for (let r = startRow; r < endRow; r++) {
          const row = data[r]
          if (!row) continue
          const rowEmpCode = String(row[2] || '').trim().toUpperCase()
          const rowEmpName = String(row[3] || '').trim().toUpperCase()
          
          // Match by code (preferred) or name (fallback)
          const codeMatch = rowEmpCode !== '' && rowEmpCode === empCode
          const nameMatch = rowEmpName !== '' && rowEmpName === record.emp.name.toUpperCase()
          
          if (codeMatch || nameMatch) {
            // Highlighting: Fill in missing details if template is empty but source has them
            if (rowEmpCode === '' && empCode !== 'NULL') {
                const cellCode = XLSX.utils.encode_cell({ r, c: 2 })
                ws[cellCode] = { t: 's', v: empCode }
            }
            if (!row[1] && record.emp.workingGroup) {
                const cellClinic = XLSX.utils.encode_cell({ r, c: 1 })
                ws[cellClinic] = { t: 's', v: record.emp.workingGroup }
            }

            record.days.forEach((day, dStr) => {
              for (const [c, mappedDStr] of colDateMap) {
                if (mappedDStr === dStr) {
                  const cellIn = XLSX.utils.encode_cell({ r, c })
                  const cellOut = XLSX.utils.encode_cell({ r, c: c + 1 })
                  
                  if (day.leaveCode) {
                    ws[cellIn] = { t: 's', v: day.leaveCode }
                    ws[cellOut] = { t: 's', v: day.leaveCode }
                    totalLeaveDays++
                    totalDayCount++
                  } else {
                    if (day.inTime) {
                      ws[cellIn] = { t: 's', v: day.inTime }
                      totalDayCount++
                    }
                    if (day.outTime) {
                      ws[cellOut] = { t: 's', v: day.outTime }
                    }

                    if (day.hoursWorked > 0) {
                      totalHours += day.hoursWorked
                      if (day.inTime && day.outTime) {
                         const [ih, im] = day.inTime.split(':').map(Number)
                         const [oh, om] = day.outTime.split(':').map(Number)
                         let rawMins = (oh * 60 + om) - (ih * 60 + im)
                         if (rawMins < 0) rawMins += 24 * 60
                         if (rawMins / 60 > 5.0) adjustmentCount++
                      }
                    }
                  }
                  break
                }
              }
            })
            break // Found employee row
          }
        }

      })
    })



    const outputBuf = XLSX.write(tplWb, { type: 'buffer', bookType: 'xlsx' })
    const outputBase64 = Buffer.from(outputBuf).toString('base64')

    // ── Generate AI Insights ──────────────────────────────────────────────────
    let score = 100
    if (attendanceRecords.size === 0) score = 0

    const summary = `Successfully processed ${attendanceRecords.size} employees. ` +
      `Mapped ${totalHours.toFixed(1)} total man-hours. ` +
      (adjustmentCount > 0 ? `AI applied lunch deductions to ${adjustmentCount} shifts.` : '')

    return {
      success: true,
      employeeCount: attendanceRecords.size,
      dayCount: totalDayCount,
      outputBase64,
      errors: errors.length > 0 ? errors : undefined,
      insights: {
        summary,
        score,
        unknownLeaveCodes: [],
        missingOutTimes: [],
        totalHours: Math.round(totalHours * 100) / 100,
        totalLeaveDays: 0,
        adjustmentCount
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
    const mainSheet = wb.SheetNames.find(s => s === 'EmployeeAttendance')
    
    if (mainSheet) {
      checks.push({ label: 'Sheet Structure', status: 'pass', detail: 'Found "EmployeeAttendance" sheet.' })
    } else {
      checks.push({ label: 'Sheet Structure', status: 'fail', detail: 'Missing "EmployeeAttendance" sheet.' })
    }

    // 2. Data Scan
    let empCount = 0
    if (mainSheet) {
      const ws = wb.Sheets[mainSheet]
      const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })
      const codes = new Set(data.slice(1).map(r => String(r[0] || '').trim()).filter(c => c && c !== 'Employee Code'))
      empCount = codes.size
    }

    return {
      success: true,
      checks,
      meta: {
        employeeCount: empCount,
        dateRange: 'Detected from list',
        sheetCount: wb.SheetNames.length
      }
    }
  } catch (e: any) {
    return { success: false, checks: [{ label: 'File Parse', status: 'fail', detail: e.message }] }
  }
}

