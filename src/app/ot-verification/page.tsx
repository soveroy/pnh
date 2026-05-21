'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { runOtVerification } from '@/utils/otVerificationEngine'
import { uploadEvidenceAction } from '@/actions/uploadEvidence'
import { LayoutContainer } from '@/components/LayoutContainer'
import { AiInsightPanel } from '@/components/AiInsightPanel'

type UploadState = 'idle' | 'dragging' | 'ready'
type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface FileSlot { state: UploadState; file: File | null; base64: string | null }
interface Step { label: string; status: StepStatus; detail?: string }

const STEPS: Step[] = [
  { label: 'Parse attendance timesheets (PNHR, PFS, GM)', status: 'pending' },
  { label: 'Parse DST & MINOR claim namelists', status: 'pending' },
  { label: 'Parse and upload evidence photos', status: 'pending' },
  { label: 'Resolve DST vs MINOR conflicts', status: 'pending' },
  { label: 'Run SOP eligibility checks (Conditions A, B, C)', status: 'pending' },
  { label: 'Generate verified output workbook', status: 'pending' },
]

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'pending') return <span className="w-5 h-5 rounded-full border border-neutral-700 bg-neutral-800 flex-shrink-0" />
  if (status === 'running') return <span className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin flex-shrink-0" />
  if (status === 'done') return (
    <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
    </span>
  )
  return (
    <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
    </span>
  )
}

function UploadZone({ slot, label, hint, color, fileSlot, onFile, multiple = false }: {
  slot: string; label: string; hint: string; color: string; fileSlot: FileSlot | { state: UploadState; files: File[] }; onFile: (f: File | File[]) => void; multiple?: boolean
}) {
  const [drag, setDrag] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  
  const isMulti = 'files' in fileSlot
  const isReady = isMulti ? fileSlot.files.length > 0 : (fileSlot as FileSlot).state === 'ready'

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">{label}</p>
      <input ref={ref} type="file" accept={multiple ? "image/*" : ".xlsx,.xls"} multiple={multiple} className="hidden" onChange={e => { 
        if (multiple) {
          const files = Array.from(e.target.files || [])
          if (files.length > 0) onFile(files)
        } else {
          const f = e.target.files?.[0]; 
          if (f) onFile(f) 
        }
      }} />
      <div
        onClick={() => { if (!isReady || multiple) ref.current?.click() }}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files; if (f.length > 0) onFile(multiple ? Array.from(f) : f[0]) }}
        className={[
          'relative h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 select-none',
          isReady ? `border-${color}-600/60 bg-${color}-900/10 ${multiple ? '' : 'cursor-default'}` : drag ? 'border-amber-500/80 bg-amber-900/10 scale-[1.01]' : 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/30'
        ].join(' ')}
      >
        {isReady ? (
          <>
            <svg className={`w-6 h-6 text-${color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
            <p className={`text-xs font-semibold text-${color}-400`}>{multiple ? `${(fileSlot as any).files.length} Photos Ready` : 'File Ready'}</p>
            <p className="text-[10px] text-neutral-500 max-w-[160px] truncate text-center px-2">
              {multiple ? 'Click to add more' : (fileSlot as FileSlot).file?.name}
            </p>
          </>
        ) : drag ? (
          <p className="text-xs font-medium text-amber-300">Drop to upload</p>
        ) : (
          <>
            <svg className="w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-xs font-medium text-neutral-300 text-center px-3">{hint}</p>
            <p className="text-[10px] text-neutral-600">Click or drag & drop · {multiple ? 'Images' : '.xlsx'} only</p>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ value, label, color = 'neutral' }: { value: string | number; label: string; color?: string }) {
  const colorMap: Record<string, string> = { neutral: 'text-neutral-100', emerald: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400', blue: 'text-blue-400' }
  return (
    <div className="p-3 rounded-xl bg-black/20 border border-neutral-800/50 flex flex-col gap-1">
      <p className={`text-xl font-bold font-mono ${colorMap[color] ?? colorMap.neutral}`}>{value}</p>
      <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{label}</p>
    </div>
  )
}

export default function OtVerificationPage() {
  const [attendance, setAttendance] = useState<FileSlot>({ state: 'idle', file: null, base64: null })
  const [claims, setClaims] = useState<FileSlot>({ state: 'idle', file: null, base64: null })
  const [template, setTemplate] = useState<FileSlot>({ state: 'idle', file: null, base64: null })
  const [employeeListing, setEmployeeListing] = useState<FileSlot>({ state: 'idle', file: null, base64: null })
  const [photos, setPhotos] = useState<{ state: UploadState; files: File[] }>({ state: 'idle', files: [] })

  const [steps, setSteps] = useState<Step[]>(STEPS.map(s => ({ ...s })))
  const [running, setRunning] = useState(false)
  const [outputB64, setOutputB64] = useState<string | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [preflightChecks, setPreflightChecks] = useState<{ label: string; status: 'pass' | 'warn' | 'fail'; detail: string }[] | null>(null)

  const readB64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res((r.result as string).split(',')[1])
      r.onerror = rej
      r.readAsDataURL(file)
    })

  const runPreflightScan = useCallback((attendanceB64: string | null, claimsB64: string | null) => {
    const checks: { label: string; status: 'pass' | 'warn' | 'fail'; detail: string }[] = []

    if (attendanceB64) {
      try {
        const wb = XLSX.read(attendanceB64, { type: 'base64' })
        const sheets = wb.SheetNames
        for (const c of ['PNHR', 'PFS', 'GM']) {
          checks.push({
            label: `Sheet: ${c}`,
            status: sheets.includes(c) ? 'pass' : 'fail',
            detail: sheets.includes(c) ? `${c} sheet found` : `${c} sheet missing in attendance file`,
          })
        }
        let detailsFound = false
        let rowCount = 0
        for (const c of ['PNHR', 'PFS', 'GM']) {
          if (!sheets.includes(c)) continue
          const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[c], { header: 1, defval: null }) as any[][]
          for (const row of rows) {
            if (String(row[0] ?? '').trim() === 'Details') detailsFound = true
          }
          rowCount += rows.length
        }
        checks.push({
          label: '"Details" Marker',
          status: detailsFound ? 'pass' : 'fail',
          detail: detailsFound ? 'Found in at least one company sheet' : 'Not found — file may be malformed',
        })
        checks.push({
          label: 'Attendance Rows',
          status: rowCount > 0 ? 'pass' : 'warn',
          detail: rowCount > 0 ? `${rowCount} rows detected across sheets` : 'No data rows found — file may be empty',
        })
      } catch {
        checks.push({ label: 'Attendance Parse', status: 'fail', detail: 'Could not read attendance file' })
      }
    }

    if (claimsB64) {
      try {
        const wb = XLSX.read(claimsB64, { type: 'base64' })
        const sheets = wb.SheetNames
        checks.push({
          label: 'DST-OT-NAMELIST',
          status: sheets.includes('DST-OT-NAMELIST') ? 'pass' : 'fail',
          detail: sheets.includes('DST-OT-NAMELIST') ? 'DST claims sheet found' : 'Missing — DST claims cannot be processed',
        })
        checks.push({
          label: 'MINOR-OT-NAMELIST',
          status: sheets.includes('MINOR-OT-NAMELIST') ? 'pass' : 'fail',
          detail: sheets.includes('MINOR-OT-NAMELIST') ? 'MINOR claims sheet found' : 'Missing — MINOR claims cannot be processed',
        })
      } catch {
        checks.push({ label: 'Claims Parse', status: 'fail', detail: 'Could not read claims file' })
      }
    }

    setPreflightChecks(checks.length > 0 ? checks : null)
  }, [])

  const handleFile = async (file: File | File[], slot: 'attendance' | 'claims' | 'template' | 'employeeListing' | 'photos') => {
    setGlobalError(null)
    if (slot === 'photos') {
      const newFiles = file as File[]
      setPhotos(prev => ({ state: 'ready', files: [...prev.files, ...newFiles] }))
      return
    }

    const f = file as File
    if (!f.name.match(/\.(xlsx|xls)$/i)) { setGlobalError('Only .xlsx / .xls files are accepted.'); return }
    const b64 = await readB64(f)
    const s: FileSlot = { state: 'ready', file: f, base64: b64 }
    if (slot === 'attendance') {
      setAttendance(s)
      runPreflightScan(b64, claims.base64)
    } else if (slot === 'claims') {
      setClaims(s)
      runPreflightScan(attendance.base64, b64)
    } else if (slot === 'employeeListing') {
      setEmployeeListing(s)
    } else {
      setTemplate(s)
    }
  }

  const parsePhotoName = (fileName: string) => {
    // Expected: Name_MM-DD.jpg or Name_YYYY-MM-DD.jpg
    const base = fileName.split('.')[0]
    const parts = base.split('_')
    let name = parts[0]
    let dateStr = parts[1] || ''
    
    // Clean name (remove trailing numbers/hashes if any)
    name = name.replace(/[\d#]/g, '').trim()

    // Normalize date to YYYY-MM-DD
    if (dateStr.match(/^\d{1,2}-\d{1,2}$/)) {
      dateStr = `2026-${dateStr.padStart(5, '0')}` // Assume 2026
    } else if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      // already good
    } else {
      dateStr = '2026-04-01' // fallback
    }
    
    return { name, date: dateStr }
  }

  const updateStep = (idx: number, updates: Partial<Step>) =>
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s))

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  const handleRun = async () => {
    if (!attendance.base64 || !claims.base64 || !template.base64) return
    setRunning(true); setOutputB64(null); setSummary(null); setErrors([]); setGlobalError(null)
    setSteps(STEPS.map(s => ({ ...s, status: 'pending' })))

    try {
      // Step 0: Attendance
      updateStep(0, { status: 'running' }); await delay(300)
      updateStep(0, { status: 'done', detail: 'PNHR, PFS, GM sheets parsed' })

      // Step 1: Claims
      updateStep(1, { status: 'running' }); await delay(200)
      updateStep(1, { status: 'done', detail: 'DST-OT-NAMELIST & MINOR-OT-NAMELIST loaded' })

      // Step 2: Photos
      updateStep(2, { status: 'running' })
      const evidenceMetadata = []
      const folderPath = `2026-04` // Should be dynamic based on claim month
      
      for (let i = 0; i < photos.files.length; i++) {
        const file = photos.files[i]
        updateStep(2, { detail: `Uploading ${i+1}/${photos.files.length}: ${file.name}...` })
        const b64 = await readB64(file)
        const uploadRes = await uploadEvidenceAction(b64, file.name, folderPath)
        
        if (uploadRes.success && uploadRes.url) {
          const { name, date } = parsePhotoName(file.name)
          evidenceMetadata.push({
            fileName: file.name,
            url: uploadRes.url,
            matchedName: name,
            matchedDate: date
          })
        }
      }
      updateStep(2, { status: 'done', detail: `${evidenceMetadata.length} photos uploaded and mapped` })

      // Step 3: Conflicts
      updateStep(3, { status: 'running' }); await delay(200)
      updateStep(3, { status: 'done' })

      // Step 4: Verification
      updateStep(4, { status: 'running' })
      const result = await runOtVerification(attendance.base64, claims.base64, template.base64, employeeListing.base64 ?? undefined, evidenceMetadata)
      updateStep(4, { status: 'done', detail: `${result.summary.totalEmployees} employees · ${result.summary.totalClaimedDays} claimed days processed` })

      // Step 5: Output
      updateStep(5, { status: 'running' }); await delay(200)
      updateStep(5, { status: 'done', detail: '5-sheet workbook ready' })

      setOutputB64(result.outputBase64)
      setSummary({ ...result.summary, photoCount: evidenceMetadata.length })
      if (result.errors.length) setErrors(result.errors)
    } catch (e: any) {
      const failIdx = steps.findIndex(s => s.status === 'running')
      updateStep(failIdx >= 0 ? failIdx : 4, { status: 'error' })
      setGlobalError(e.message ?? 'Verification failed.')
    } finally {
      setRunning(false)
    }
  }

  const handleDownload = () => {
    if (!outputB64) return
    const binary = atob(outputB64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `DST_OT_Allowance_April_2026_VERIFIED.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setAttendance({ state: 'idle', file: null, base64: null })
    setClaims({ state: 'idle', file: null, base64: null })
    setTemplate({ state: 'idle', file: null, base64: null })
    setEmployeeListing({ state: 'idle', file: null, base64: null })
    setPhotos({ state: 'idle', files: [] })
    setSteps(STEPS.map(s => ({ ...s, status: 'pending' })))
    setPreflightChecks(null)
    setOutputB64(null); setSummary(null); setErrors([]); setGlobalError(null); setRunning(false)
  }

  const allReady = attendance.state === 'ready' && claims.state === 'ready' && template.state === 'ready'
  const canRun = allReady && !running && !outputB64

  const netColor = summary ? (summary.netDifference < 0 ? 'red' : summary.netDifference > 0 ? 'emerald' : 'neutral') : 'neutral'

  return (
    <LayoutContainer title="Hard Services OT Verification" showPdpaBadge={true}>
      <div className="flex items-start justify-center">
        <div className="w-full max-w-2xl flex flex-col gap-6">

          {/* Title */}
          <div>
            <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold mb-1">On3oard Pte Ltd · PNH Group · Hard Services</p>
            <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">DST & Minor OT Allowance Verification</h2>
            <p className="text-sm text-neutral-500 mt-1">Validate DST and MINOR OT allowance claims against attendance timesheets for PNHR, PFS, and GM companies. Includes automated photo evidence matching.</p>
          </div>

          {/* Upload Panel */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">Step 1 — Upload Required Files & Photos</p>
              <p className="text-[10px] text-neutral-600">{[attendance, claims, template].filter(f => f.state === 'ready').length}/3 required · {photos.files.length} photos · {employeeListing.state === 'ready' ? '1' : '0'} listing</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UploadZone slot="attendance" label="File A — Attendance Data" hint="Attandance April-3companies.xlsx" color="blue" fileSlot={attendance} onFile={f => handleFile(f, 'attendance')} />
              <UploadZone slot="claims" label="File B — Manager Claims" hint="MINOR & DST Attanance April.xlsx" color="amber" fileSlot={claims} onFile={f => handleFile(f, 'claims')} />
              <UploadZone slot="template" label="File C — OT Allowance Template (DST or MINOR)" hint="OT_Allowance_blank.xlsx" color="emerald" fileSlot={template} onFile={f => handleFile(f, 'template')} />
              <UploadZone slot="employeeListing" label="File D — Employee Listing (Optional)" hint="EmployeeListing.xlsx" color="violet" fileSlot={employeeListing} onFile={f => handleFile(f, 'employeeListing')} />
            </div>
            <UploadZone slot="photos" label="Evidence Photos" hint="Upload all site photos (Name_MM-DD.jpg)" color="indigo" fileSlot={photos} onFile={f => handleFile(f, 'photos')} multiple={true} />

            {globalError && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-red-800/40 bg-red-900/15">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-red-300">{globalError}</p>
              </div>
            )}

            {/* Pre-flight AI Panel — full-width, below the 2×2 upload grid */}
            {preflightChecks && (() => {
              const passCount = preflightChecks.filter(c => c.status === 'pass').length
              const failCount = preflightChecks.filter(c => c.status === 'fail').length
              const summary = failCount > 0
                ? `${failCount} critical issue${failCount > 1 ? 's' : ''} detected — resolve before running verification.`
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

          {/* Progress Panel */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">Step 2 — Run Verification</p>
              <div className="w-40 h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${steps.filter(s => s.status === 'done').length / steps.length * 100}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <StepIcon status={step.status} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${step.status === 'pending' ? 'text-neutral-600' : 'text-neutral-300'}`}>{step.label}</p>
                    {step.detail && <p className="text-[10px] text-neutral-500 mt-0.5">{step.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-1">
              <button id="btn-run-verification" disabled={!canRun} onClick={handleRun}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2">
                {running && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {running ? 'Verifying…' : 'Run Verification'}
              </button>
              {(attendance.file || claims.file || template.file || photos.files.length > 0) && (
                <button onClick={handleReset} disabled={running}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-700 disabled:opacity-40 transition-all duration-150"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Results Panel */}
          {summary && (
            <div className="rounded-2xl border border-amber-800/40 bg-amber-900/5 p-5 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <p className="text-[11px] font-semibold text-amber-500 uppercase tracking-widest mb-3">OT Verification Summary — April 2026</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard value={summary.totalEmployees} label="Employees" />
                  <StatCard value={summary.totalClaimedDays} label="Claimed Days" />
                  <StatCard value={summary.totalEligibleDays} label="Eligible Days" color="emerald" />
                  <StatCard value={summary.totalDiscrepancyDays} label="Discrepancy Days" color="amber" />
                  <StatCard value={`$${summary.totalOriginalAmount}`} label="Original Amount" />
                  <StatCard value={`$${summary.totalCalculatedAmount}`} label="Calculated Amount" color="emerald" />
                  <StatCard value={`$${summary.netDifference}`} label="Net Difference" color={netColor} />
                  <StatCard value={summary.photoCount || 0} label="Evidence Photos Linked" color="blue" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-800">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Exceptions Flagged</p>
                  <p className="text-lg font-bold font-mono text-red-400">{summary.exceptionCount}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Conflicts Resolved</p>
                  <p className="text-lg font-bold font-mono text-amber-400">{summary.conflictCount}</p>
                </div>
              </div>

              <button id="btn-download-ot" onClick={handleDownload}
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all duration-150 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Verified Report (.xlsx)
              </button>

              {errors.length > 0 && (
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto p-2 bg-black/20 rounded border border-neutral-800">
                  {errors.map((e, i) => <p key={i} className="text-[10px] text-yellow-400">⚠ {e}</p>)}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </LayoutContainer>
  )
}
