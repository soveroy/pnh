'use server'

import { createClient as createStatelessClient } from '@supabase/supabase-js'
import { Buffer } from 'node:buffer'

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

      if (empCode && totalHours > 0 && designation.includes('AMK')) {
        records.push({ code: empCode, hours: totalHours, name: String(row[1] || '').trim() })
        csvEmpCodes.add(empCode.toUpperCase())
      }
    }

    // 3. Map to Template with ExcelJS (Formatter)
    const nhgpWorkbook = new ExcelJS.Workbook()
    await nhgpWorkbook.xlsx.load(Buffer.from(templateArrayBuffer))
    
    const ws1 = nhgpWorkbook.getWorksheet('Staff Attendance-1st Half')
    const ws2 = nhgpWorkbook.getWorksheet('Staff Attendance-2nd Half')

    if (!ws1 || !ws2) throw new Error('Template sheets missing.')

    // Simplified mapping for performance
    const mapping: Record<string, number> = {}
    ws1.eachRow((row, rowNum) => {
      const code = String(row.getCell(2).value || '').trim().toUpperCase()
      if (csvEmpCodes.has(code)) mapping[code] = rowNum
    })

    // ... (Add mapping logic if needed, but let's keep it minimal for now to test stability)

    return { success: true, count: records.length }

  } catch (error: any) {
    console.error('Action error:', error)
    return { success: false, error: error.message }
  }
}
