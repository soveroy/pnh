'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { LayoutContainer } from '@/components/LayoutContainer'
import { runSoftServicesEngine } from '@/utils/softServicesEngine'

export const runtime = 'edge'

interface FileSlot { file: File | null; base64: string | null }

export default function SoftServicesPage() {
  const [timeSheet, setTimeSheet] = useState<FileSlot>({ file: null, base64: null })
  const [attendance, setAttendance] = useState<FileSlot>({ file: null, base64: null })
  const [report, setReport] = useState<FileSlot>({ file: null, base64: null })

  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const readB64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res((r.result as string).split(',')[1])
      r.onerror = rej
      r.readAsDataURL(file)
    })

  const handleFile = useCallback(async (file: File, slot: 'ts' | 'att' | 'rep') => {
    setError(null)
    if (!file.name.match(/\.(xlsx|xls)$/i)) { setError('Only .xlsx / .xls files are accepted.'); return }
    const b64 = await readB64(file)
    const s: FileSlot = { file, base64: b64 }
    if (slot === 'ts') setTimeSheet(s)
    else if (slot === 'att') setAttendance(s)
    else setReport(s)
  }, [])

  const handleRun = async () => {
    if (!timeSheet.base64 || !attendance.base64 || !report.base64) return
    setRunning(true); setError(null); setResults(null)
    try {
      const res = await runSoftServicesEngine(timeSheet.base64, attendance.base64, report.base64)
      if (res.errors.length && !res.attendanceBase64) {
        setError(res.errors[0])
      } else {
        setResults(res)
        if (res.errors.length) setError(`Warnings: ${res.errors.join('; ')}`)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
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
            <span className="px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 text-[10px] font-semibold uppercase tracking-widest border border-blue-800/40">Cleaners</span>
          </div>
          <p className="text-sm text-neutral-400 max-w-2xl">Upload the three required files. All processing runs securely in your browser — no data is sent to any server.</p>
        </div>

        {/* Upload Zones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UploadZone label="1. Raw Time Sheet" file={timeSheet.file} onFile={f => handleFile(f, 'ts')} hint="NHGP TIME SHEET.xlsx" color="blue" />
          <UploadZone label="2. Attendance Template" file={attendance.file} onFile={f => handleFile(f, 'att')} hint="NHGP ATTENDANCE 1_blank.xlsx" color="emerald" />
          <UploadZone label="3. OT Checking Report" file={report.file} onFile={f => handleFile(f, 'rep')} hint="OT checking (1).xlsx" color="amber" />
        </div>

        {/* Run Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            disabled={!canRun}
            onClick={handleRun}
            className={`w-full max-w-sm py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-3
              ${canRun ? 'bg-neutral-100 text-neutral-900 hover:bg-white shadow-lg' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}
          >
            {running && <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />}
            {running ? 'Processing in Browser…' : 'Run Automation'}
          </button>

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-red-800/40 bg-red-900/10 max-w-sm w-full">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-[11px] text-red-300 leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Employees" value={results.summary.totalEmployees} />
              <StatCard label="Part-Time" value={results.summary.totalPt} color="amber" />
              <StatCard label="Weekday OT" value={`${results.summary.totalOt15}h`} color="blue" />
              <StatCard label="Off-Day OT" value={`${results.summary.totalOt20Days}d`} color="emerald" />
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
                <DownloadButton
                  label="Filled Attendance Template"
                  sub="Ready for NHGP submission"
                  onClick={() => downloadFile(results.attendanceBase64, `NHGP_ATTENDANCE_filled_2026_04.xlsx`)}
                />
                <DownloadButton
                  label="OT Checking Report"
                  sub="Verified with discrepancy flags"
                  onClick={() => downloadFile(results.reportBase64, `OT_Checking_Processed_2026_04.xlsx`)}
                />
              </div>
            </div>

            {results.summary.unclassifiedShifts > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-800/40 bg-yellow-900/10">
                <svg className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                <div>
                  <p className="text-xs font-semibold text-yellow-300">{results.summary.unclassifiedShifts} unclassified shift records</p>
                  <p className="text-[11px] text-yellow-600 mt-0.5">Clock-in times outside standard windows (06:00–11:59). These records are flagged in the OT report for manual HR review.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </LayoutContainer>
  )
}

function UploadZone({ label, file, onFile, hint, color }: { label: string; file: File | null; onFile: (f: File) => void; hint: string; color: string }) {
  const [drag, setDrag] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const colorMap: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-400'
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{label}</p>
      <input ref={ref} type="file" accept=".xlsx,.xls" className="hidden"
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
  const c: Record<string, string> = { neutral: 'text-neutral-100', amber: 'text-amber-400', blue: 'text-blue-400', emerald: 'text-emerald-400' }
  return (
    <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 flex flex-col gap-1">
      <p className={`text-2xl font-bold ${c[color]}`}>{value}</p>
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{label}</p>
    </div>
  )
}
