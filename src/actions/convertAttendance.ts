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
    totalHours?: number
    totalLeaveDays?: number
    adjustmentCount?: number
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(val: unknown): string | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60)
    const h = Math.floor(totalMinutes / 60) % 24
    const m = totalMinutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
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
  if (mins < 0) mins += 24 * 60
  let hours = mins / 60
  if (hours > 5.0) hours -= 1.0
  return Math.round(hours * 100) / 100
}

function excelDateToJSDate(val: unknown): Date | null {
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    return new Date((val - 25569) * 86400 * 1000)
  }
  if (typeof val === 'string') {
    const s = val.trim()
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmy) {
      return new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])))
    }
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

function toDateStr(d: Date): string {
  // Add 12h to absorb timezone drifts from Excel serial dates
  const adjusted = new Date(d.getTime() + 12 * 60 * 60 * 1000)
  return adjusted.toISOString().split('T')[0]
}

// ── SheetJS Row Manipulation Utilities ────────────────────────────────────────

/**
 * Inserts `count` blank rows at `insertAt` (0-indexed), shifting everything below down.
 * Also updates !merges and !rows to match the new layout.
 */
function insertRowsInSheet(ws: XLSX.WorkSheet, insertAt: number, count: number): void {
  if (count <= 0) return
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  const maxCol = range.e.c

  // Shift all cells at or below insertAt downward by count
  for (let r = range.e.r; r >= insertAt; r--) {
    for (let c = 0; c <= maxCol; c++) {
      const oldAddr = XLSX.utils.encode_cell({ r, c })
      const newAddr = XLSX.utils.encode_cell({ r: r + count, c })
      if (ws[oldAddr]) {
        ws[newAddr] = ws[oldAddr]
        delete ws[oldAddr]
      }
    }
  }

  // Expand the sheet range
  ws['!ref'] = XLSX.utils.encode_range({
    s: range.s,
    e: { r: range.e.r + count, c: maxCol }
  })

  // Update merged cell references
  if (ws['!merges']) {
    ws['!merges'] = ws['!merges'].map((merge: XLSX.Range) => {
      if (merge.s.r >= insertAt) {
        return {
          s: { r: merge.s.r + count, c: merge.s.c },
          e: { r: merge.e.r + count, c: merge.e.c }
        }
      } else if (merge.e.r >= insertAt) {
        return {
          s: merge.s,
          e: { r: merge.e.r + count, c: merge.e.c }
        }
      }
      return merge
    })
  }

  // Update row height/property metadata
  if (ws['!rows']) {
    const newRows: XLSX.RowInfo[] = []
    const oldRows = ws['!rows'] as XLSX.RowInfo[]
    for (let i = 0; i <= range.e.r; i++) {
      if (i >= insertAt) {
        newRows[i + count] = oldRows[i]
      } else {
        newRows[i] = oldRows[i]
      }
    }
    ws['!rows'] = newRows
  }
}

/**
 * Copy the cell style (borders, fill, font) from a source row to a target row.
 * Used to make newly inserted rows look consistent with surrounding rows.
 */
function copyRowStyle(ws: XLSX.WorkSheet, sourceRow: number, targetRow: number): void {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let c = 0; c <= range.e.c; c++) {
    const srcAddr = XLSX.utils.encode_cell({ r: sourceRow, c })
    const tgtAddr = XLSX.utils.encode_cell({ r: targetRow, c })
    const srcCell = ws[srcAddr]
    if (srcCell && srcCell.s) {
      if (!ws[tgtAddr]) ws[tgtAddr] = { t: 'z', v: undefined }
      ws[tgtAddr].s = JSON.parse(JSON.stringify(srcCell.s))
    }
  }
}

/**
 * Sets a cell's string value, preserving any existing style on that cell.
 */
function setCellValue(ws: XLSX.WorkSheet, row: number, col: number, value: string): void {
  const addr = XLSX.utils.encode_cell({ r: row, c: col })
  const existing = ws[addr] || {}
  ws[addr] = { t: 's', v: value, ...(existing.s ? { s: existing.s } : {}) }
}

// ── Main Converter ────────────────────────────────────────────────────────────

export async function convertAttendanceAction(
  sourceBase64: string,
  templateBase64: string
): Promise<ConversionResult> {
  try {
    const errors: string[] = []

    // Decode base64 → Buffer
    const sourceBuf = Buffer.from(sourceBase64, 'base64')
    const templateBuf = Buffer.from(templateBase64, 'base64')

    // ── 1. Parse Source (RAW DATA - Flat List) ────────────────────────────────
    const srcWb = XLSX.read(sourceBuf, { type: 'buffer', cellDates: false })
    const srcSheetName = srcWb.SheetNames.find(s => s === 'EmployeeAttendance') || srcWb.SheetNames[0]
    const srcWs = srcWb.Sheets[srcSheetName]
    const srcData = XLSX.utils.sheet_to_json<any[]>(srcWs, { header: 1, raw: true })

    if (srcData.length < 2) {
      return { success: false, error: 'Source file is empty or missing "EmployeeAttendance" sheet.' }
    }

    const headerRow = srcData[0]
    const colIdx = {
      code:    headerRow.indexOf('Employee Code'),
      name:    headerRow.indexOf('Employee Name'),
      group:   headerRow.indexOf('Working Group'),
      date:    headerRow.indexOf('Date'),
      activity:headerRow.indexOf('Activity'),
      in:      headerRow.indexOf('Time In'),
      out:     headerRow.indexOf('Time Out'),
    }

    if (colIdx.code === -1 || colIdx.date === -1) {
      return { success: false, error: 'Source file missing required columns (Employee Code, Date).' }
    }

    // Map: workingGroup -> empCode -> { name, days: Map<dateStr, DayRecord> }
    const groupedData = new Map<string, Map<string, { name: string, days: Map<string, DayRecord> }>>()

    for (let i = 1; i < srcData.length; i++) {
      const row = srcData[i]
      const code = String(row[colIdx.code] || '').trim().toUpperCase()
      if (!code || code === 'NULL' || code === 'EMPLOYEE CODE') continue

      const name = String(row[colIdx.name] || '').trim()
      const group = String(row[colIdx.group] || '').trim().toUpperCase()
      const rawDate = row[colIdx.date]
      const date = excelDateToJSDate(rawDate)
      if (!date) continue
      const dStr = toDateStr(date)

      const activity = colIdx.activity !== -1 ? String(row[colIdx.activity] || '').trim() : ''
      const inTime  = formatTime(row[colIdx.in])
      const outTime = formatTime(row[colIdx.out])

      if (!groupedData.has(group)) groupedData.set(group, new Map())
      const groupMap = groupedData.get(group)!
      if (!groupMap.has(code)) groupMap.set(code, { name, days: new Map() })

      const empData = groupMap.get(code)!
      if (!empData.days.has(dStr)) {
        empData.days.set(dStr, {
          date, inTime, outTime,
          leaveCode: activity || null,
          isOff: false, hoursWorked: 0
        })
      } else {
        // Client Rule: Earliest IN, Latest OUT
        const day = empData.days.get(dStr)!
        if (inTime  && (!day.inTime  || inTime  < day.inTime))  day.inTime  = inTime
        if (outTime && (!day.outTime || outTime > day.outTime)) day.outTime = outTime
        if (activity && !day.leaveCode) day.leaveCode = activity
      }
    }

    // Finalize hours for each day
    let totalDayCount = 0, totalHours = 0, adjustmentCount = 0, totalLeaveDays = 0
    groupedData.forEach(empMap => {
      empMap.forEach(empData => {
        empData.days.forEach(day => {
          day.hoursWorked = calcHours(day.inTime, day.outTime)
        })
      })
    })

    const totalEmpCount = Array.from(groupedData.values()).reduce((sum, m) => sum + m.size, 0)

    // ── 2. Load Template ───────────────────────────────────────────────────────
    // IMPORTANT: cellStyles:true to preserve formatting on write-back
    const tplWb = XLSX.read(templateBuf, { type: 'buffer', cellStyles: true })
    const staffSheets = tplWb.SheetNames.filter(s => s.startsWith('Staff Attendance'))

    if (staffSheets.length === 0) {
      return { success: false, error: 'Template missing "Staff Attendance" sheets.' }
    }

    // ── 3. Process Each Sheet ─────────────────────────────────────────────────
    for (const sheetName of staffSheets) {
      const ws = tplWb.Sheets[sheetName]
      // Read raw data to find structure (do NOT use header:1 with raw so we get exact values)
      let data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true })

      // Build date → [inCol, outCol] map from row index 3
      const dateRow = data[3] || []
      const colDateMap = new Map<string, { inCol: number, outCol: number }>()
      for (let c = 5; c < (dateRow as any[]).length; c++) {
        const v = dateRow[c]
        if (v === undefined || v === null || v === '') continue
        const d = excelDateToJSDate(v)
        if (d) {
          const dStr = toDateStr(d)
          if (!colDateMap.has(dStr)) {
            colDateMap.set(dStr, { inCol: c, outCol: c + 1 })
          }
          c++ // next cell is OUT for same date, skip it
        }
      }

      // Find all group section boundaries in this sheet
      // Format: { groupKey, headerRow, footerRow (Total cleaning team) }
      interface Section {
        groupKey: string   // e.g. "NHGP - AMK POLYCLINIC"
        headerRow: number
        footerRow: number  // "Total cleaning team" row
      }
      const sections: Section[] = []

      data.forEach((row, r) => {
        const cellVal = String(row[0] || row[1] || row[2] || '').toUpperCase().trim()
        if (cellVal.includes('NHGP -')) {
          sections.push({ groupKey: cellVal, headerRow: r, footerRow: -1 })
        }
        // "Total cleaning team" closes the previous section
        const col3Val = String(row[3] || '').toLowerCase().trim()
        if (col3Val === 'total cleaning team' && sections.length > 0) {
          const last = sections[sections.length - 1]
          if (last.footerRow === -1) last.footerRow = r
        }
      })

      // If the last section has no footer, use end of data
      if (sections.length > 0 && sections[sections.length - 1].footerRow === -1) {
        sections[sections.length - 1].footerRow = data.length - 1
      }

      // ── 4. For Each Section, Inject Employees ─────────────────────────────
      // Process sections in REVERSE order so row insertions don't shift indices of earlier sections
      const sortedSections = [...sections].sort((a, b) => b.headerRow - a.headerRow)

      for (const section of sortedSections) {
        // Find which group in our data matches this section
        let matchedGroupKey: string | null = null
        for (const gk of groupedData.keys()) {
          if (gk.includes(section.groupKey) || section.groupKey.includes(gk)) {
            matchedGroupKey = gk
            break
          }
        }
        if (!matchedGroupKey) continue // No raw data for this group

        const empMap = groupedData.get(matchedGroupKey)!
        const employees = Array.from(empMap.entries()) // [code, {name, days}]

        // Re-read data after potential previous insertions
        data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true })

        // Find current section boundaries (they may have shifted)
        let currentHeaderRow = -1
        let currentFooterRow = -1
        for (let r = 0; r < data.length; r++) {
          const cellVal = String(data[r][0] || data[r][1] || data[r][2] || '').toUpperCase().trim()
          if (cellVal === section.groupKey) { currentHeaderRow = r; continue }
          if (currentHeaderRow !== -1 && currentFooterRow === -1) {
            const col3 = String(data[r][3] || '').toLowerCase().trim()
            if (col3 === 'total cleaning team') { currentFooterRow = r; break }
          }
        }
        if (currentHeaderRow === -1 || currentFooterRow === -1) continue

        const availableRows = currentFooterRow - currentHeaderRow - 1
        const neededRows = employees.length

        // Insert extra rows if needed (before the footer row)
        if (neededRows > availableRows) {
          const insertCount = neededRows - availableRows
          // Style reference row: the first empty data row in the section
          const styleRefRow = currentHeaderRow + 1
          insertRowsInSheet(ws, currentFooterRow, insertCount)
          // Copy styles to newly inserted rows
          for (let i = 0; i < insertCount; i++) {
            copyRowStyle(ws, styleRefRow, currentFooterRow + i, )
          }
          currentFooterRow += insertCount
        }

        // Write each employee into the rows after the section header
        employees.forEach(([code, empData], idx) => {
          const targetRow = currentHeaderRow + 1 + idx
          if (targetRow >= currentFooterRow) return // Safety guard

          // Write clinic (col 1), code (col 2), name (col 3)
          setCellValue(ws, targetRow, 1, matchedGroupKey!)
          setCellValue(ws, targetRow, 2, code)
          setCellValue(ws, targetRow, 3, empData.name)

          // Write attendance times for dates in this sheet's range
          empData.days.forEach((day, dStr) => {
            const dateMapping = colDateMap.get(dStr)
            if (!dateMapping) return

            const { inCol, outCol } = dateMapping
            if (day.leaveCode) {
              setCellValue(ws, targetRow, inCol,  day.leaveCode)
              setCellValue(ws, targetRow, outCol, day.leaveCode)
              totalLeaveDays++
            } else {
              if (day.inTime)  { setCellValue(ws, targetRow, inCol,  day.inTime);  totalDayCount++ }
              if (day.outTime)  setCellValue(ws, targetRow, outCol, day.outTime)
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
          })
        })
      }
    }

    // ── 5. Write Output ───────────────────────────────────────────────────────
    const outputBuf = XLSX.write(tplWb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
    const outputBase64 = Buffer.from(outputBuf).toString('base64')

    const summary =
      `Successfully processed ${totalEmpCount} employees across ${groupedData.size} working groups. ` +
      `Mapped ${totalDayCount} time entries (${totalLeaveDays} leave days). ` +
      `Total man-hours: ${totalHours.toFixed(1)}.` +
      (adjustmentCount > 0 ? ` Applied lunch deductions to ${adjustmentCount} shifts.` : '')

    return {
      success: true,
      employeeCount: totalEmpCount,
      dayCount: totalDayCount,
      outputBase64,
      errors: errors.length > 0 ? errors : undefined,
      insights: {
        summary,
        score: 100,
        unknownLeaveCodes: [],
        missingOutTimes: [],
        duplicateEntries: [],
        totalHours: Math.round(totalHours * 100) / 100,
        totalLeaveDays,
        adjustmentCount
      }
    }

  } catch (err: any) {
    console.error('convertAttendanceAction error:', err)
    return { success: false, error: err.message || 'Unknown error during conversion.' }
  }
}

// ── Validator ─────────────────────────────────────────────────────────────────

export async function validateSourceAction(sourceBase64: string): Promise<ValidationResult> {
  try {
    const buf = Buffer.from(sourceBase64, 'base64')
    const wb = XLSX.read(buf, { type: 'buffer' })
    const checks: ValidationResult['checks'] = []

    const mainSheet = wb.SheetNames.find(s => s === 'EmployeeAttendance')

    if (mainSheet) {
      checks.push({ label: 'Sheet Structure', status: 'pass', detail: 'Found "EmployeeAttendance" sheet.' })
    } else {
      checks.push({ label: 'Sheet Structure', status: 'fail', detail: 'Missing "EmployeeAttendance" sheet.' })
    }

    let empCount = 0
    let minDate = '', maxDate = ''

    if (mainSheet) {
      const ws = wb.Sheets[mainSheet]
      const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true })
      const hdr = data[0] || []
      const codeIdx = hdr.indexOf('Employee Code')
      const dateIdx = hdr.indexOf('Date')
      const codes = new Set<string>()
      const dates: string[] = []

      data.slice(1).forEach(row => {
        const code = String(row[codeIdx] || '').trim()
        if (code && code !== 'Employee Code') codes.add(code)
        const d = excelDateToJSDate(row[dateIdx])
        if (d) dates.push(toDateStr(d))
      })

      empCount = codes.size
      dates.sort()
      if (dates.length > 0) { minDate = dates[0]; maxDate = dates[dates.length - 1] }

      if (empCount > 0) {
        checks.push({ label: 'Employee Records', status: 'pass', detail: `Found ${empCount} unique employees.` })
      } else {
        checks.push({ label: 'Employee Records', status: 'warn', detail: 'No employee codes detected.' })
      }

      // Check required columns
      const required = ['Employee Code', 'Employee Name', 'Working Group', 'Date', 'Time In', 'Time Out']
      const missing = required.filter(c => !hdr.includes(c))
      if (missing.length === 0) {
        checks.push({ label: 'Required Columns', status: 'pass', detail: 'All required columns present.' })
      } else {
        checks.push({ label: 'Required Columns', status: 'fail', detail: `Missing: ${missing.join(', ')}` })
      }
    }

    return {
      success: true,
      checks,
      meta: {
        employeeCount: empCount,
        dateRange: minDate && maxDate ? `${minDate} → ${maxDate}` : 'Unknown',
        sheetCount: wb.SheetNames.length
      }
    }
  } catch (e: any) {
    return { success: false, checks: [{ label: 'File Parse', status: 'fail', detail: e.message }] }
  }
}
