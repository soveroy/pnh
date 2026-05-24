'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { LayoutContainer } from '@/components/LayoutContainer'
import { AiInsightPanel } from '@/components/AiInsightPanel'
import { runSoftServicesEngine, SheetStatus } from '@/utils/softServicesEngine'
import { getSupabaseClient } from '@/utils/supabase'

export const runtime = 'edge'

interface FileSlot { file: File | null; base64: string | null }

export default function SoftServicesPage() {
  const [timeSheet, setTimeSheet] = useState<FileSlot>({ file: null, base64: null })
  const [attendance, setAttendance] = useState<FileSlot>({ file: null, base64: null })
  const [attendance2, setAttendance2] = useState<FileSlot>({ file: null, base64: null })
  const [report, setReport] = useState<FileSlot>({ file: null, base64: null })

  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [preflightChecks, setPreflightChecks] = useState<{ label: string; status: 'pass' | 'warn' | 'fail'; detail: string }[] | null>(null)
  const [activeTab, setActiveTab] = useState<'engine' | 'playbook'>('engine')

  useEffect(() => {
    fetch('/api/notify-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'soft-services',
        action: 'page_visit'
      })
    }).catch(err => console.error('Failed to notify page visit:', err))
  }, [])

  const readB64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res((r.result as string).split(',')[1])
      r.onerror = rej
      r.readAsDataURL(file)
    })

  // ---------------------------------------------------------------------------
  // PRE-FLIGHT SCANNER
  // Reads already-in-memory Base64 blobs; no server calls needed.
  // ---------------------------------------------------------------------------
  const runPreflightScan = useCallback((
    tsB64: string | null,
    attB64: string | null,
    att2B64: string | null,
    repB64: string | null
  ) => {
    const checks: { label: string; status: 'pass' | 'warn' | 'fail'; detail: string }[] = []

    // ── 1. Raw Time Sheet ────────────────────────────────────────────────────
    if (tsB64) {
      try {
        const wb = XLSX.read(tsB64, { type: 'base64' })
        const hasEmpAtt = wb.SheetNames.includes('EmployeeAttendance')
        checks.push({
          label: 'Sheet: EmployeeAttendance',
          status: hasEmpAtt ? 'pass' : 'fail',
          detail: hasEmpAtt
            ? 'EmployeeAttendance sheet found'
            : 'Missing — engine requires this exact sheet name',
        })

        if (hasEmpAtt) {
          const ws = wb.Sheets['EmployeeAttendance']
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]
          const hdr = (rows[0] || []).map((h: any) => String(h ?? '').trim())
          const required = ['Employee Code', 'Date', 'Time In', 'Time Out']
          const missing = required.filter(c => !hdr.includes(c))
          checks.push({
            label: 'Time Sheet Headers',
            status: missing.length === 0 ? 'pass' : 'fail',
            detail: missing.length === 0
              ? 'All required columns present'
              : `Missing column(s): ${missing.join(', ')}`,
          })

          const dataRows = rows.slice(1).filter(r => r[hdr.indexOf('Employee Code')])
          checks.push({
            label: 'Time Sheet Data',
            status: dataRows.length > 0 ? 'pass' : 'warn',
            detail: dataRows.length > 0
              ? `${dataRows.length} employee record row(s) detected`
              : 'No data rows found — file may be empty',
          })
        }
      } catch {
        checks.push({ label: 'Time Sheet Parse', status: 'fail', detail: 'Could not read time sheet file' })
      }
    }

    // ── 2. Attendance Sheet(s) ───────────────────────────────────────────────
    const attSlots: [string | null, string][] = [[attB64, 'Attendance 1'], [att2B64, 'Attendance 2']]
    for (const [b64, label] of attSlots) {
      if (!b64) continue
      try {
        const wb = XLSX.read(b64, { type: 'base64' })
        const realSheets = wb.SheetNames.filter(n => !/^sheet\d*$/i.test(n))
        checks.push({
          label: `${label}: Site Sheets`,
          status: realSheets.length > 0 ? 'pass' : 'warn',
          detail: realSheets.length > 0
            ? `${realSheets.length} site sheet(s) found`
            : 'Only default Sheet tabs found — may be blank',
        })

        if (realSheets.length > 0) {
          const ws = wb.Sheets[realSheets[0]]
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]
          const dateRow = rows[3] || []
          const hasDates = dateRow.some((v: any) => {
            if (!v) return false
            const s = String(v)
            return /\d{1,2}\/\d{1,2}\/\d{4}/.test(s) || /\d{4}-\d{2}-\d{2}/.test(s) || (!isNaN(Number(v)) && Number(v) > 40000)
          })
          checks.push({
            label: `${label}: Date Headers (Row 4)`,
            status: hasDates ? 'pass' : 'warn',
            detail: hasDates
              ? 'Date row detected in row 4'
              : 'No dates found in row 4 — structure may differ',
          })

          const hasCodes = rows.some(row => row[2] && /^G/i.test(String(row[2]).trim()))
          checks.push({
            label: `${label}: Cleaner Codes`,
            status: hasCodes ? 'pass' : 'warn',
            detail: hasCodes
              ? 'Cleaner G-codes found in column C'
              : 'No G-prefixed codes in column C — verify format',
          })
        }
      } catch {
        checks.push({ label: `${label} Parse`, status: 'fail', detail: `Could not read ${label} file` })
      }
    }

    // ── 3. OT Checking Report ────────────────────────────────────────────────
    if (repB64) {
      try {
        const wb = XLSX.read(repB64, { type: 'base64' })
        checks.push({
          label: 'OT Report Template',
          status: wb.SheetNames.length > 0 ? 'pass' : 'fail',
          detail: wb.SheetNames.length > 0
            ? `Template ready — ${wb.SheetNames.length} sheet(s)`
            : 'No sheets found in OT report template',
        })
      } catch {
        checks.push({ label: 'OT Report Parse', status: 'fail', detail: 'Could not read OT report template' })
      }
    }

    setPreflightChecks(checks.length > 0 ? checks : null)
  }, [])

  const handleFile = useCallback(async (file: File, slot: 'ts' | 'att' | 'att2' | 'rep') => {
    setError(null)
    if (!file.name.match(/\.(xlsx|xls|xlsb)$/i)) { setError('Only .xlsx / .xls / .xlsb files are accepted.'); return }
    const b64 = await readB64(file)
    const s: FileSlot = { file, base64: b64 }
    // Update slot state, then trigger pre-flight scan with the freshest values
    if (slot === 'ts') {
      setTimeSheet(s)
      runPreflightScan(b64, attendance.base64, attendance2.base64, report.base64)
    } else if (slot === 'att') {
      setAttendance(s)
      runPreflightScan(timeSheet.base64, b64, attendance2.base64, report.base64)
    } else if (slot === 'att2') {
      setAttendance2(s)
      runPreflightScan(timeSheet.base64, attendance.base64, b64, report.base64)
    } else {
      setReport(s)
      runPreflightScan(timeSheet.base64, attendance.base64, attendance2.base64, b64)
    }
  }, [runPreflightScan, timeSheet.base64, attendance.base64, attendance2.base64, report.base64])

  const logUsage = async (status: 'success' | 'error', summaryData?: any, errMsg?: string) => {
    try {
      const payload: any = {
        tool: 'soft-services',
        action: 'run_automation',
        status,
        errorMessage: errMsg || null,
        meta: null
      }
      
      if (summaryData) {
        payload.meta = {
          totalEmployees: summaryData.totalEmployees || 0,
          targetMonth: summaryData.targetMonth || 'Unknown',
          totalPt: summaryData.totalPt || 0,
          totalOt15: typeof summaryData.totalOt15 === 'number' ? summaryData.totalOt15 : parseFloat(summaryData.totalOt15) || 0,
          totalOt20Days: typeof summaryData.totalOt20Days === 'number' ? summaryData.totalOt20Days : parseFloat(summaryData.totalOt20Days) || 0,
          totalOt20AdditionalHrs: typeof summaryData.totalOt20AdditionalHrs === 'number' ? summaryData.totalOt20AdditionalHrs : parseFloat(summaryData.totalOt20AdditionalHrs) || 0
        }
      }
      
      await fetch('/api/notify-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      console.error('Usage logging failed:', err)
    }
  }

  const handleRun = async () => {
    if (!timeSheet.base64 || !attendance.base64 || !report.base64) return
    setRunning(true); setError(null); setResults(null)
    try {
      const attFiles = [attendance.base64]
      if (attendance2.base64) attFiles.push(attendance2.base64)
      const res = await runSoftServicesEngine(timeSheet.base64, attFiles, report.base64)
      if (res.errors.length && !res.attendanceBase64) {
        const errorMsg = res.errors[0]
        setError(errorMsg)
        logUsage('error', undefined, errorMsg).catch(err => console.error('Usage logging async error:', err))
      } else {
        setResults(res)
        if (res.errors.length) setError(`Warnings: ${res.errors.join('; ')}`)
        logUsage('success', res.summary).catch(err => console.error('Usage logging async error:', err))
      }
    } catch (e: any) {
      const errorMsg = e.message || 'Unknown error occurred'
      setError(errorMsg)
      logUsage('error', undefined, errorMsg).catch(err => console.error('Usage logging async error:', err))
    } finally {
      setRunning(false)
    }
  }

  const handleReset = () => {
    setTimeSheet({ file: null, base64: null })
    setAttendance({ file: null, base64: null })
    setAttendance2({ file: null, base64: null })
    setReport({ file: null, base64: null })
    setResults(null)
    setError(null)
    setPreflightChecks(null)
    setRunning(false)
  }

  const downloadFile = (b64: string, filename: string) => {
    const link = document.createElement('a')
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${b64}`
    link.download = filename
    link.click()
  }

  const canRun = !!(timeSheet.file && attendance.file && report.file && !running)

  return (
    <LayoutContainer title="HR Soft Service (Cleaners) AI Automation" showPdpaBadge={true}>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">

        {/* Header */}
        <div className="space-y-2">
          <Link href="/" className="inline-flex items-center text-xs text-neutral-500 hover:text-neutral-300 transition-colors gap-1 mb-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">NHGP Soft Services OT Automation</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 text-[10px] font-semibold uppercase tracking-widest border border-blue-800/40">Cleaners · v2</span>
          </div>
          <p className="text-sm text-neutral-400 max-w-2xl">
            Upload the three required files. All processing runs securely in your browser — no data is sent to any server.
            Full 2025–2026 SG Public Holiday calendar applied automatically.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 gap-6">
          <button
            onClick={() => setActiveTab('engine')}
            className={`pb-3 text-sm font-semibold relative transition-all duration-200 ${
              activeTab === 'engine' ? 'text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            OT Automation Engine
            {activeTab === 'engine' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: '#ff914d' }} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('playbook')}
            className={`pb-3 text-sm font-semibold relative transition-all duration-200 ${
              activeTab === 'playbook' ? 'text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            HR Playbook & Guide
            {activeTab === 'playbook' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: '#ff914d' }} />
            )}
          </button>
        </div>

        {activeTab === 'engine' ? (
          <>
            {/* Upload Zones */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">Step 1 — Upload Required Files</p>
            <p className="text-[10px] text-neutral-600">
              {[timeSheet, attendance, report].filter(f => f.file).length}/3 required
              {attendance2.file ? ' · Att 2 loaded' : ''}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <UploadZone label="1. Raw Time Sheet" file={timeSheet.file} onFile={f => handleFile(f, 'ts')} hint="NHGP TIME SHEET.xlsx" color="blue" />
            <UploadZone label="2. Attendance 1" file={attendance.file} onFile={f => handleFile(f, 'att')} hint="NHGP ATTENDANCE 1.xlsx" color="emerald" />
            <UploadZone label="3. Attendance 2 (Opt)" file={attendance2.file} onFile={f => handleFile(f, 'att2')} hint="NHGP ATTENDANCE 2.xlsb" color="emerald" />
            <UploadZone label="4. OT Checking Report" file={report.file} onFile={f => handleFile(f, 'rep')} hint="OT checking (1).xlsx" color="amber" />
          </div>

          {/* AI Pre-flight Check Panel */}
          {preflightChecks && (() => {
            const passCount = preflightChecks.filter(c => c.status === 'pass').length
            const failCount = preflightChecks.filter(c => c.status === 'fail').length
            const summary = failCount > 0
              ? `${failCount} critical issue${failCount > 1 ? 's' : ''} detected — resolve before running automation.`
              : `${passCount}/${preflightChecks.length} checks passed — file structure looks good.`
            return (
              <AiInsightPanel
                type="pre-flight"
                title="AI Pre-flight Check"
                summary={summary}
                checks={preflightChecks}
              />
            )
          })()}
        </div>

        {/* Run Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            disabled={!canRun}
            onClick={handleRun}
            style={canRun ? { backgroundColor: '#ff914d', color: '#0a0a0a' } : undefined}
            className={`w-full max-w-sm py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-3
              ${canRun ? 'hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-orange-500/10' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}
          >
            {running && <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />}
            {running ? 'Processing in Browser…' : 'Run Automation'}
          </button>

          {(timeSheet.file || attendance.file || report.file) && !running && !results && (
            <button onClick={handleReset}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Reset all files
            </button>
          )}

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-yellow-800/40 bg-yellow-900/10 max-w-lg w-full">
              <svg className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-[11px] text-yellow-300 leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Target Month Banner */}
            {results.summary.targetMonth && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900/60">
                <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-xs text-neutral-300">
                  Target month auto-detected: <span className="font-bold text-neutral-100">{results.summary.targetMonth}</span>
                </p>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard label="Employees" value={results.summary.totalEmployees} />
              <StatCard label="Part-Time" value={results.summary.totalPt} color="amber" />
              <StatCard label="Weekday OT" value={`${results.summary.totalOt15}h`} color="blue" />
              <StatCard label="Off-Day OT" value={`${results.summary.totalOt20Days}d`} color="emerald" />
              <StatCard label="Addl OT 2.0" value={`+${results.summary.totalOt20AdditionalHrs}h`} color="purple" />
            </div>

            {/* Sheet Status */}
            {results.sheetStatus && results.sheetStatus.length > 0 && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                <div className="px-5 py-3 border-b border-neutral-800 flex items-center gap-2">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Attendance Sheet Validation</p>
                  <span className="text-[10px] text-neutral-600">— sheets outside target month are skipped automatically</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">File</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Sheet</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Detected Period</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Overlap</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                      {results.sheetStatus.map((s: SheetStatus, i: number) => (
                        <tr key={i} className="hover:bg-neutral-800/30 transition-colors">
                          <td className="px-4 py-2 text-neutral-500 text-[11px]">{s.file}</td>
                          <td className="px-4 py-2 text-neutral-300 font-medium text-[11px]">{s.sheet}</td>
                          <td className="px-4 py-2 text-neutral-400 text-[11px] font-mono">{s.detectedPeriod}</td>
                          <td className="px-4 py-2 text-[11px]">
                            <span className={s.overlapPct >= 90 ? 'text-emerald-400' : s.overlapPct >= 50 ? 'text-amber-400' : 'text-red-400'}>
                              {s.overlapPct}%
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest
                              ${s.status === 'GREEN' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40' :
                                s.status === 'PARTIAL' ? 'bg-amber-900/40 text-amber-400 border border-amber-800/40' :
                                'bg-red-900/40 text-red-400 border border-red-800/40'}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-neutral-500 text-[11px]">{s.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Downloads */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
              <div className={`grid grid-cols-1 ${results.attendance2Base64 ? 'md:grid-cols-3' : 'md:grid-cols-2'} divide-y md:divide-y-0 md:divide-x divide-neutral-800`}>
                <DownloadButton
                  label="Filled Attendance 1"
                  sub="Template 1 ready"
                  onClick={() => downloadFile(results.attendanceBase64, `NHGP_ATTENDANCE_1_${results.summary.targetMonth}.xlsx`)}
                />
                {results.attendance2Base64 && (
                  <DownloadButton
                    label="Filled Attendance 2"
                    sub="Template 2 ready"
                    onClick={() => downloadFile(results.attendance2Base64!, `NHGP_ATTENDANCE_2_${results.summary.targetMonth}.xlsx`)}
                  />
                )}
                <DownloadButton
                  label="OT Checking Report"
                  sub="Full verification log"
                  onClick={() => downloadFile(results.reportBase64, `OT_Checking_${results.summary.targetMonth}.xlsx`)}
                />
              </div>
            </div>

            {/* Unclassified warning */}
            {results.summary.unclassifiedShifts > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-800/40 bg-yellow-900/10">
                <svg className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                <div>
                  <p className="text-xs font-semibold text-yellow-300">{results.summary.unclassifiedShifts} unclassified shift records</p>
                  <p className="text-[11px] text-yellow-600 mt-0.5">Clock-in times outside standard windows. Flagged in OT report for manual HR review.</p>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        ) : (
          <PlaybookTabContent />
        )}
      </div>
    </LayoutContainer>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================
function UploadZone({ label, file, onFile, hint, color }: { label: string; file: File | null; onFile: (f: File) => void; hint: string; color: string }) {
  const [drag, setDrag] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const colorMap: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{label}</p>
      <input ref={ref} type="file" accept=".xlsx,.xls,.xlsb" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { onFile(f); e.target.value = '' } }} />
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
        className={`h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 select-none
          ${file ? colorMap[color] : drag ? 'border-white/20 bg-white/5 scale-[1.02]' : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/40'}`}
      >
        {file ? (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <p className="text-xs font-bold truncate max-w-[160px]">{file.name}</p>
            <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest">Click to replace</p>
          </>
        ) : (
          <>
            <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-[11px] font-medium text-neutral-400 text-center px-4 leading-tight">{hint}</p>
            <p className="text-[9px] opacity-30 font-bold uppercase tracking-widest">Click or drag & drop</p>
          </>
        )}
      </div>
    </div>
  )
}

function DownloadButton({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-6 hover:bg-neutral-800/50 transition-all flex items-center justify-between group text-left w-full">
      <div>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Download</p>
        <p className="text-sm font-semibold text-neutral-200">{label}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-700 transition-colors shrink-0 ml-4">
        <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      </div>
    </button>
  )
}

function StatCard({ label, value, color = 'neutral' }: { label: string; value: string | number; color?: string }) {
  const c: Record<string, string> = {
    neutral: 'text-neutral-100',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
  }
  return (
    <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 flex flex-col gap-1">
      <p className={`text-2xl font-bold ${c[color]}`}>{value}</p>
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{label}</p>
    </div>
  )
}

function PlaybookTabContent() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Intro Hero Card */}
      <div className="p-6 rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 to-neutral-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff914d' }} />
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">PNH HR Hub</p>
          </div>
          <h3 className="text-xl font-bold text-neutral-100 tracking-tight">Soft Services Playbook & User Guide</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Welcome to your interactive in-app user guide. This playbook explains all features, calculation formulas, and validation badges to help you process overtime for Soft Services cleaners quickly and easily.
          </p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-[11px] text-neutral-300 font-mono shrink-0">
          PDPA Compliant · In-Browser Engine
        </div>
      </div>

      {/* Legacy vs Automation Comparison */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Legacy vs. AI Automation</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/30 space-y-3">
            <div className="flex items-center gap-2 text-red-400/80">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h4 className="text-xs font-bold uppercase tracking-wider">The Legacy Manual Era</h4>
            </div>
            <ul className="space-y-2 text-[11px] text-neutral-400 leading-relaxed list-disc list-inside">
              <li>Manually transcribing punch times from biometric files into templates.</li>
              <li>Calculations done using tedious Excel sheets with human typing mistakes.</li>
              <li>Manually cross-referencing Public Holidays and Sundays for double rates.</li>
              <li>Manually filtering and skipping part-time staff based on shift hours.</li>
              <li>No layout validation, risking data corruption or silent calculation failures.</li>
            </ul>
          </div>
          
          <div className="p-5 rounded-2xl border border-neutral-800/80 bg-neutral-900/60 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 text-emerald-400">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <h4 className="text-xs font-bold uppercase tracking-wider">The Automated AI Hub Era</h4>
            </div>
            <ul className="space-y-2 text-[11px] text-neutral-300 leading-relaxed list-disc list-inside">
              <li className="marker:text-emerald-400">Files parsed instantly in memory (100% locally in your browser).</li>
              <li className="marker:text-emerald-400">Automatic shift classification & public holiday calendar processing.</li>
              <li className="marker:text-emerald-400">Accurate Sunday/PH split calculations (Standard vs Additional Hours).</li>
              <li className="marker:text-emerald-400">Smart part-time exclusions applied automatically.</li>
              <li className="marker:text-emerald-400">Real-time validation flags (GREEN/PARTIAL/STALE) to protect data sheet health.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Required Files Checklist */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Required Files & Structures</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-2">
            <span className="w-5 h-5 rounded bg-blue-900/30 text-blue-400 flex items-center justify-center text-[10px] font-bold">1</span>
            <p className="text-xs font-bold text-neutral-200">Raw Time Sheet</p>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Must contain a sheet named <span className="font-mono text-neutral-300 text-[9px] bg-neutral-800 px-1 py-0.5 rounded">EmployeeAttendance</span> with headers: Employee Code, Date, Time In, Time Out.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-2">
            <span className="w-5 h-5 rounded bg-emerald-900/30 text-emerald-400 flex items-center justify-center text-[10px] font-bold">2</span>
            <p className="text-xs font-bold text-neutral-200">Attendance Sheet 1</p>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Polyclinic sheets where column C has cleaner codes starting with <span className="font-mono text-neutral-300 text-[9px] bg-neutral-800 px-1 py-0.5 rounded">G</span> and row 4 has dates.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-2">
            <span className="w-5 h-5 rounded bg-emerald-900/30 text-emerald-400 flex items-center justify-center text-[10px] font-bold">3</span>
            <p className="text-xs font-bold text-neutral-200">Attendance Sheet 2</p>
            <p className="text-[10px] text-neutral-400 leading-relaxed font-normal">
              (Optional) Secondary sheet if you have two templates to populate. Same layout rules as Attendance 1.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-2">
            <span className="w-5 h-5 rounded bg-amber-900/30 text-amber-400 flex items-center justify-center text-[10px] font-bold">4</span>
            <p className="text-xs font-bold text-neutral-200">OT Checking Report</p>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Template file for generating validation logs comparing the biometric time sheet vs attendance.
            </p>
          </div>
        </div>
      </div>

      {/* Rules Accordions */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Calculation Rules & Logic</p>
        <div className="space-y-3">
          
          <details className="group border border-neutral-800 bg-neutral-900/40 rounded-xl overflow-hidden transition-all duration-200">
            <summary className="px-5 py-4 flex items-center justify-between font-semibold text-xs text-neutral-200 cursor-pointer hover:bg-neutral-800/30 select-none">
              <span>Weekday Shifts OT (Rate 1.5×)</span>
              <svg className="w-4 h-4 text-neutral-500 group-open:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="px-5 pb-5 pt-1 border-t border-neutral-800 text-[11px] text-neutral-400 leading-relaxed space-y-2">
              <p>Weekday overtime is calculated automatically depending on the cleaner's clock-in time:</p>
              <ul className="list-disc list-inside pl-2 space-y-1.5">
                <li><strong className="text-neutral-300">Shift 1 (Morning):</strong> If clock-in is before or at <span className="text-neutral-200 font-mono">08:30</span>, the shift ends at <span className="text-neutral-200 font-mono">17:00</span>. Any hours worked after <span className="text-neutral-200 font-mono">17:00</span> are calculated as OT.</li>
                <li><strong className="text-neutral-300">Shift 2 (Mid-day):</strong> If clock-in is after or at <span className="text-neutral-200 font-mono">09:30</span>, the shift ends at <span className="text-neutral-200 font-mono">19:30</span>. Any hours worked after <span className="text-neutral-200 font-mono">19:30</span> are calculated as OT.</li>
                <li><strong className="text-neutral-300">Smart Mid-Zone Handling:</strong> If clock-in is between <span className="text-neutral-200 font-mono">08:31</span> and <span className="text-neutral-200 font-mono">09:29</span>, the engine uses the clock-out time to determine the correct shift assignment.</li>
                <li><strong className="text-neutral-300">30-Minute Rounding:</strong> All calculated weekday OT is automatically rounded down to the nearest 30-minute block (e.g. 1h 40m becomes 1.5h).</li>
              </ul>
            </div>
          </details>

          <details className="group border border-neutral-800 bg-neutral-900/40 rounded-xl overflow-hidden transition-all duration-200">
            <summary className="px-5 py-4 flex items-center justify-between font-semibold text-xs text-neutral-200 cursor-pointer hover:bg-neutral-800/30 select-none">
              <span>Saturday Shifts OT (Rate 1.5×)</span>
              <svg className="w-4 h-4 text-neutral-500 group-open:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="px-5 pb-5 pt-1 border-t border-neutral-800 text-[11px] text-neutral-400 leading-relaxed space-y-2">
              <p>Saturdays feature distinct work triggers to accommodate polyclinic weekend operational hours:</p>
              <ul className="list-disc list-inside pl-2 space-y-1.5">
                <li><strong className="text-neutral-300">Shift 1 (Morning):</strong> OT triggers after <span className="text-neutral-200 font-mono">13:30</span>.</li>
                <li><strong className="text-neutral-300">Shift 2 (Mid-day):</strong> OT triggers after <span className="text-neutral-200 font-mono">15:00</span>.</li>
                <li><strong className="text-neutral-300">Shift 3 (Late):</strong> If clock-in occurs after <span className="text-neutral-200 font-mono">12:00</span> on a Saturday, no OT is calculated.</li>
              </ul>
            </div>
          </details>

          <details className="group border border-neutral-800 bg-neutral-900/40 rounded-xl overflow-hidden transition-all duration-200">
            <summary className="px-5 py-4 flex items-center justify-between font-semibold text-xs text-neutral-200 cursor-pointer hover:bg-neutral-800/30 select-none">
              <span>Sundays & Public Holidays (Rate 2.0× Dual Split)</span>
              <svg className="w-4 h-4 text-neutral-500 group-open:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="px-5 pb-5 pt-1 border-t border-neutral-800 text-[11px] text-neutral-400 leading-relaxed space-y-3">
              <p>
                Sundays and Public Holidays pay 2.0× double rates, which the engine splits into standard "Days" and "Additional Hours":
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-900/60 rounded-lg border border-neutral-800 space-y-1">
                  <p className="text-xs font-bold text-neutral-200">1. Standard OT Days</p>
                  <p className="text-[10px] text-neutral-400">
                    If hours worked ≤ 4.0: counts as <strong className="text-neutral-300">0.5 Days</strong>.<br />
                    If hours worked &gt; 4.0: counts as <strong className="text-neutral-300">1.0 Day</strong> (capped at 1.0 day).
                  </p>
                </div>
                <div className="p-3 bg-neutral-900/60 rounded-lg border border-neutral-800 space-y-1">
                  <p className="text-xs font-bold text-neutral-200">2. Additional Hours ("addl")</p>
                  <p className="text-[10px] text-neutral-400">
                    If total worked time exceeds 8.0 hours, the first 8h are covered by the 1.0 standard day. All hours <strong className="text-neutral-300">beyond 8h</strong> are calculated as additional hourly OT.
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 italic">
                *The system integrates the full 2025–2026 Singapore Public Holiday calendar to automatically identify rest days.
              </p>
            </div>
          </details>

          <details className="group border border-neutral-800 bg-neutral-900/40 rounded-xl overflow-hidden transition-all duration-200">
            <summary className="px-5 py-4 flex items-center justify-between font-semibold text-xs text-neutral-200 cursor-pointer hover:bg-neutral-800/30 select-none">
              <span>Part-Time Cleaners Exclusion Rule</span>
              <svg className="w-4 h-4 text-neutral-500 group-open:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="px-5 pb-5 pt-1 border-t border-neutral-800 text-[11px] text-neutral-400 leading-relaxed space-y-2">
              <p>Part-time workers are not eligible for standard overtime. The system filters them out based on work-day statistics:</p>
              <ul className="list-disc list-inside pl-2 space-y-1.5">
                <li>If a cleaner's average daily worked hours are <strong className="text-neutral-300">≤ 5.5 hours</strong>...</li>
                <li>AND they have <strong className="text-neutral-300">no single day</strong> exceeding <strong className="text-neutral-300">6.0 worked hours</strong>...</li>
                <li>They are classified as <strong className="text-neutral-300">Part-Time</strong>. The engine logs them as PT and excludes them from receiving OT calculations to prevent payroll errors.</li>
              </ul>
            </div>
          </details>

        </div>
      </div>

      {/* FAQ & Troubleshooting */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">FAQ & Calculations Reference</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-2">
            <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              What does "null" mean in Excel?
            </h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              In the generated Excel sheets, <span className="font-mono text-neutral-300 bg-neutral-800 px-1 py-0.5 rounded text-[10px]">null</span> indicates <strong className="text-neutral-300">no OT hours or no data</strong>. This represents days the employee did not work, was absent, or did not perform overtime matching the shifts. Leaving it blank/null keeps the spreadsheets tidy and readable.
            </p>
          </div>
          
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-2">
            <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              What is "addl" on Sundays/PH?
            </h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              <strong className="text-neutral-300">"addl"</strong> refers to <strong className="text-neutral-300">Additional OT Hours</strong>. If a cleaner works more than 8 hours on a rest day/Public Holiday, they receive 1.0 day of standard OT, and the hours worked beyond 8.0h are calculated separately as additional hourly OT. You will see these listed as <span className="text-purple-400 font-bold font-mono">+X.Xh addl</span> in the audit logs.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-2">
            <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Why are sheets "Skipped"?
            </h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              If an attendance sheet displays a status of <span className="text-amber-400 font-bold">PARTIAL</span> (50-89% overlap) or <span className="text-red-400 font-bold">STALE</span> (&lt;50% overlap), the engine automatically skips writing to protect your files. This prevents filling wrong templates (e.g. pasting March time sheets into an April attendance template).
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-2">
            <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Is my data secure?
            </h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              <strong className="text-neutral-300">100% Yes.</strong> The automation engine executes fully within your web browser memory using standard JS logic. No files or personal biometric details are ever uploaded to external servers, satisfying strict PDPA and healthcare data security protocols.
            </p>
          </div>
        </div>
      </div>

      {/* Step-by-Step Action Plan */}
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-center">Your Monthly Workflow</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="space-y-1 relative text-center">
            <span className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center mx-auto text-xs font-bold text-neutral-300">1</span>
            <p className="text-xs font-bold text-neutral-200 mt-2">Upload Files</p>
            <p className="text-[10px] text-neutral-500">Drop the required biometric and attendance files.</p>
          </div>
          <div className="space-y-1 relative text-center">
            <span className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center mx-auto text-xs font-bold text-neutral-300">2</span>
            <p className="text-xs font-bold text-neutral-200 mt-2">Review Badges</p>
            <p className="text-[10px] text-neutral-500">Confirm the AI Pre-flight Check is all Green.</p>
          </div>
          <div className="space-y-1 relative text-center">
            <span className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center mx-auto text-xs font-bold text-neutral-300">3</span>
            <p className="text-xs font-bold text-neutral-200 mt-2">Run Automation</p>
            <p className="text-[10px] text-neutral-500">Click the orange button to calculate monthly OT.</p>
          </div>
          <div className="space-y-1 relative text-center">
            <span className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center mx-auto text-xs font-bold text-neutral-300">4</span>
            <p className="text-xs font-bold text-neutral-200 mt-2">Download Results</p>
            <p className="text-[10px] text-neutral-500">Save populated sheets and audit logs safely.</p>
          </div>
        </div>
      </div>

    </div>
  )
}
