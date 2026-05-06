'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { LayoutContainer } from '@/components/LayoutContainer'
import { runSoftServicesAutomation } from '@/actions/softServicesAction'

type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface FileSlot { 
  file: File | null; 
  base64: string | null 
}

export default function SoftServicesPage() {
  const [timeSheet, setTimeSheet] = useState<FileSlot>({ file: null, base64: null })
  const [attendance, setAttendance] = useState<FileSlot>({ file: null, base64: null })
  const [report, setReport] = useState<FileSlot>({ file: null, base64: null })
  
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<StepStatus>('pending')

  const readB64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res((r.result as string).split(',')[1])
      r.onerror = rej
      r.readAsDataURL(file)
    })

  const handleFile = useCallback(async (file: File, slot: 'ts' | 'att' | 'rep') => {
    setError(null)
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Only .xlsx or .xls files are accepted.')
      return
    }
    const b64 = await readB64(file)
    const s: FileSlot = { file, base64: b64 }
    if (slot === 'ts') setTimeSheet(s)
    else if (slot === 'att') setAttendance(s)
    else setReport(s)
  }, [])

  const handleRun = async () => {
    if (!timeSheet.base64 || !attendance.base64 || !report.base64) return
    
    setRunning(true)
    setStatus('running')
    setError(null)
    setResults(null)

    try {
      const res = await runSoftServicesAutomation(
        timeSheet.base64,
        attendance.base64,
        report.base64
      )

      if (res.success) {
        setResults(res)
        setStatus('done')
      } else {
        setError(res.error || 'Processing failed')
        setStatus('error')
      }
    } catch (e: any) {
      setError(e.message)
      setStatus('error')
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

  const canRun = timeSheet.file && attendance.file && report.file && !running

  return (
    <LayoutContainer title="HR Soft Service (Cleaners) AI Automation" showPdpaBadge={true}>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        
        {/* Header Section */}
        <div className="space-y-2">
          <Link href="/" className="inline-flex items-center text-xs text-neutral-500 hover:text-neutral-300 transition-colors gap-1 mb-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">NHGP Soft Services OT Automation</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 text-[10px] font-semibold uppercase tracking-widest border border-blue-800/40">Cleaners Tool</span>
          </div>
          <p className="text-sm text-neutral-400 max-w-2xl">
            Automate monthly OT calculation for cleaners. Processes raw biometric logs into the official attendance template with automated shift & part-time detection.
          </p>
        </div>

        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UploadZone 
            label="1. Raw Time Sheet" 
            file={timeSheet.file} 
            onFile={(f) => handleFile(f, 'ts')} 
            hint="NHGP TIME SHEET.xlsx"
            color="blue"
          />
          <UploadZone 
            label="2. Attendance Template" 
            file={attendance.file} 
            onFile={(f) => handleFile(f, 'att')} 
            hint="NHGP ATTENDANCE 1_blank.xlsx"
            color="emerald"
          />
          <UploadZone 
            label="3. OT Checking Report" 
            file={report.file} 
            onFile={(f) => handleFile(f, 'rep')} 
            hint="OT checking (1).xlsx"
            color="amber"
          />
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-center gap-4 py-4">
          <button
            disabled={!canRun}
            onClick={handleRun}
            className={`
              w-full max-w-sm py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200
              ${canRun 
                ? 'bg-neutral-100 text-neutral-900 hover:bg-white shadow-lg shadow-white/5' 
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}
              flex items-center justify-center gap-3
            `}
          >
            {running && <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />}
            {running ? 'Processing Data...' : 'Run Automation'}
          </button>
          
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-red-800/40 bg-red-900/10 max-w-sm">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-[11px] text-red-300 leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Employees" value={results.summary.totalEmployees} />
              <StatCard label="Part-Time Detected" value={results.summary.totalPt} color="amber" />
              <StatCard label="Total Weekday OT" value={`${results.summary.totalOt15}h`} color="blue" />
              <StatCard label="Total Off-Day OT" value={`${results.summary.totalOt20Days}d`} color="emerald" />
            </div>

            <div className="p-1 rounded-2xl bg-neutral-900/50 border border-neutral-800 overflow-hidden">
               <div className="grid grid-cols-1 md:grid-cols-2">
                <button 
                  onClick={() => downloadFile(results.attendanceBase64, 'NHGP_ATTENDANCE_filled.xlsx')}
                  className="p-6 hover:bg-neutral-800/50 transition-all flex items-center justify-between group border-b md:border-b-0 md:border-r border-neutral-800"
                >
                  <div className="text-left">
                    <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-1">Generated Output</p>
                    <p className="text-base font-semibold text-neutral-200">Filled Attendance Template</p>
                    <p className="text-xs text-neutral-500 mt-1">Ready for submission to NHGP</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </div>
                </button>

                <button 
                  onClick={() => downloadFile(results.reportBase64, 'OT_Checking_Processed.xlsx')}
                  className="p-6 hover:bg-neutral-800/50 transition-all flex items-center justify-between group"
                >
                  <div className="text-left">
                    <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-1">Audit Report</p>
                    <p className="text-base font-semibold text-neutral-200">Processed OT Checking</p>
                    <p className="text-xs text-neutral-500 mt-1">Verified records with discrepancy flags</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </LayoutContainer>
  )
}

function UploadZone({ label, file, onFile, hint, color }: { label: string; file: File | null; onFile: (f: File) => void; hint: string; color: string }) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const colorMap: Record<string, { border: string, bg: string, text: string }> = {
    blue: { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400' },
    emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
    amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400' }
  }

  const activeColor = colorMap[color]

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">{label}</p>
      <input 
        ref={inputRef} 
        type="file" 
        accept=".xlsx,.xls" 
        className="hidden" 
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onFile(f);
            e.target.value = ''; // Reset so same file can be picked again
          }
        }} 
      />
      <div 
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        className={`
          relative h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200
          ${file 
            ? `${activeColor.border} ${activeColor.bg} ${activeColor.text}` 
            : drag 
              ? 'border-neutral-400 bg-neutral-800 scale-[1.02]' 
              : 'border-neutral-800 bg-neutral-900/30 hover:border-neutral-700 hover:bg-neutral-900/60'}
        `}
      >
        {file ? (
          <>
            <div className={`w-10 h-10 rounded-full ${activeColor.bg} flex items-center justify-center border ${activeColor.border}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-xs font-bold truncate max-w-[160px]">{file.name}</p>
            <p className="text-[10px] opacity-60 uppercase tracking-widest font-semibold">Click to change</p>
          </>
        ) : (
          <>
            <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-[11px] font-medium opacity-40 text-center px-4 leading-tight">{hint}</p>
            <p className="text-[9px] opacity-30 font-bold uppercase tracking-widest">Click or drag & drop</p>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'neutral' }: { label: string; value: string | number; color?: string }) {
  const textColors: Record<string, string> = {
    neutral: 'text-neutral-100',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400'
  }
  
  return (
    <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm flex flex-col gap-1">
      <p className={`text-2xl font-bold tracking-tight ${textColors[color]}`}>{value}</p>
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{label}</p>
    </div>
  )
}
