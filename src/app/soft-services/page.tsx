'use client'

import { useState, useRef } from 'react'
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, slot: 'ts' | 'att' | 'rep') => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await readB64(file)
    if (slot === 'ts') setTimeSheet({ file, base64 })
    else if (slot === 'att') setAttendance({ file, base64 })
    else setReport({ file, base64 })
  }

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
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="space-y-2">
          <Link href="/" className="inline-flex items-center text-xs text-neutral-500 hover:text-neutral-300 transition-colors gap-1 mb-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">NHGP Soft Services OT Automation</h2>
          <p className="text-sm text-neutral-400">
            Automate monthly OT calculation for cleaners. Processes raw time sheets, detects part-time status, determines shifts, and populates the NHGP attendance template.
          </p>
        </div>

        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UploadCard 
            label="Raw Time Sheet" 
            file={timeSheet.file} 
            onChange={(e) => handleFileChange(e, 'ts')} 
            hint="NHGP TIME SHEET.xlsx"
            color="blue"
          />
          <UploadCard 
            label="Attendance Template" 
            file={attendance.file} 
            onChange={(e) => handleFileChange(e, 'att')} 
            hint="NHGP ATTENDANCE 1_blank.xlsx"
            color="emerald"
          />
          <UploadCard 
            label="OT Checking Report" 
            file={report.file} 
            onChange={(e) => handleFileChange(e, 'rep')} 
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
              w-full max-w-sm py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200
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
            <p className="text-xs text-red-400 font-medium bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20">
              Error: {error}
            </p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => downloadFile(results.attendanceBase64, 'NHGP_ATTENDANCE_filled.xlsx')}
                className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/80 transition-all flex items-center justify-between group"
              >
                <div className="text-left">
                  <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-1">Download</p>
                  <p className="text-sm font-medium text-neutral-200">Filled Attendance Template</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
              </button>

              <button 
                onClick={() => downloadFile(results.reportBase64, 'OT_Checking_Processed.xlsx')}
                className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/80 transition-all flex items-center justify-between group"
              >
                <div className="text-left">
                  <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-1">Download</p>
                  <p className="text-sm font-medium text-neutral-200">Processed OT Checking Report</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
              </button>
            </div>
          </div>
        )}

      </div>
    </LayoutContainer>
  )
}

function UploadCard({ label, file, onChange, hint, color }: { label: string; file: File | null; onChange: (e: any) => void; hint: string; color: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  
  const colors: Record<string, string> = {
    blue: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-400'
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">{label}</p>
      <div 
        onClick={() => inputRef.current?.click()}
        className={`
          h-32 rounded-xl border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center gap-2 cursor-pointer
          hover:border-neutral-700 hover:bg-neutral-900/50 transition-all duration-200
          ${file ? colors[color] : 'text-neutral-500'}
        `}
      >
        <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={onChange} />
        {file ? (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <p className="text-xs font-semibold truncate max-w-[150px]">{file.name}</p>
          </>
        ) : (
          <>
            <svg className="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-[10px] font-medium opacity-60 text-center px-4">{hint}</p>
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
    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 flex flex-col gap-1">
      <p className={`text-xl font-bold tracking-tight ${textColors[color]}`}>{value}</p>
      <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">{label}</p>
    </div>
  )
}
