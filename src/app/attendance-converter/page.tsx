'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { convertAttendanceAction, validateSourceAction, ValidationResult } from '@/actions/convertAttendance'
import { AiInsightPanel } from '@/components/AiInsightPanel'

type UploadState = 'idle' | 'dragging' | 'ready'
type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface FileSlot {
  state: UploadState
  file: File | null
  base64: string | null
}

interface Step {
  label: string
  status: StepStatus
  detail?: string
}

const INITIAL_STEPS: Step[] = [
  { label: 'Parse source sheets', status: 'pending' },
  { label: 'Map attendance codes to NHGP template', status: 'pending' },
  { label: 'Generate output file', status: 'pending' },
]

export default function AttendanceConverterPage() {
  const [source, setSource] = useState<FileSlot>({ state: 'idle', file: null, base64: null })
  const [template, setTemplate] = useState<FileSlot>({ state: 'idle', file: null, base64: null })
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS)
  const [isConverting, setIsConverting] = useState(false)
  const [outputBase64, setOutputBase64] = useState<string | null>(null)
  const [stats, setStats] = useState<{ employees: number; days: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [globalError, setGlobalError] = useState<string | null>(null)
  
  // AI Intelligence States
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [insights, setInsights] = useState<{
    unknownLeaveCodes: string[]
    missingOutTimes: string[]
    score: number
    summary: string
  } | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const sourceInputRef = useRef<HTMLInputElement>(null)
  const templateInputRef = useRef<HTMLInputElement>(null)

  // ── File reading ────────────────────────────────────────────────────────────
  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // result = "data:...;base64,XXXX" → strip prefix
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleFileAccepted = useCallback(
    async (file: File, slot: 'source' | 'template') => {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        if (slot === 'source') setSource(s => ({ ...s, state: 'idle' }))
        else setTemplate(t => ({ ...t, state: 'idle' }))
        setGlobalError('Only .xlsx / .xls files are accepted.')
        return
      }
      setGlobalError(null)
      const b64 = await readFileAsBase64(file)
      if (slot === 'source') {
        setSource({ state: 'ready', file, base64: b64 })
        // Run AI Pre-flight validation
        setIsValidating(true)
        const res = await validateSourceAction(b64)
        setValidation(res)
        setIsValidating(false)
      } else {
        setTemplate({ state: 'ready', file, base64: b64 })
      }
    },
    []
  )

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const makeDragHandlers = (slot: 'source' | 'template') => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      if (slot === 'source' && source.state !== 'ready')
        setSource(s => ({ ...s, state: 'dragging' }))
      if (slot === 'template' && template.state !== 'ready')
        setTemplate(t => ({ ...t, state: 'dragging' }))
    },
    onDragLeave: () => {
      if (slot === 'source' && source.state === 'dragging')
        setSource(s => ({ ...s, state: 'idle' }))
      if (slot === 'template' && template.state === 'dragging')
        setTemplate(t => ({ ...t, state: 'idle' }))
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileAccepted(file, slot)
    },
    onClick: () => {
      if (slot === 'source' && source.state !== 'ready') sourceInputRef.current?.click()
      if (slot === 'template' && template.state !== 'ready') templateInputRef.current?.click()
    },
  })

  const updateStep = (idx: number, updates: Partial<Step>) => {
    setSteps(prev => prev.map((s, i) => (i === idx ? { ...s, ...updates } : s)))
  }

  // ── Conversion ──────────────────────────────────────────────────────────────
  const handleConvert = async () => {
    if (!source.base64 || !template.base64) return
    setIsConverting(true)
    setOutputBase64(null)
    setStats(null)
    setErrors([])
    setGlobalError(null)
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending' })))

    await new Promise(r => setTimeout(r, 120))

    // Step 1
    updateStep(0, { status: 'running' })
    await new Promise(r => setTimeout(r, 400))
    updateStep(0, { status: 'done' })

    // Step 2
    updateStep(1, { status: 'running' })
    await new Promise(r => setTimeout(r, 300))

    let result
    try {
      result = await convertAttendanceAction(source.base64, template.base64)
    } catch (e: any) {
      updateStep(1, { status: 'error' })
      setGlobalError(e.message || 'Unexpected error.')
      setIsConverting(false)
      return
    }

    if (!result.success) {
      updateStep(1, { status: 'error' })
      setGlobalError(result.error || 'Conversion failed.')
      setIsConverting(false)
      return
    }

    updateStep(1, { status: 'done', detail: `${result.employeeCount} employees · ${result.dayCount} day records` })

    updateStep(2, { status: 'done' })

    setOutputBase64(result.outputBase64!)
    setStats({ employees: result.employeeCount!, days: result.dayCount! })
    if (result.insights) setInsights(result.insights)
    if (result.errors?.length) setErrors(result.errors)
    setIsConverting(false)
  }

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!outputBase64) return
    const binary = atob(outputBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `NHGP_Converted_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setSource({ state: 'idle', file: null, base64: null })
    setTemplate({ state: 'idle', file: null, base64: null })
    setSteps(INITIAL_STEPS)
    setOutputBase64(null)
    setStats(null)
    setErrors([])
    setGlobalError(null)
    setIsConverting(false)
    if (sourceInputRef.current) sourceInputRef.current.value = ''
    if (templateInputRef.current) templateInputRef.current.value = ''
  }

  const isReady = source.state === 'ready' && template.state === 'ready'
  const canConvert = isReady && !isConverting && !outputBase64

  // ── Step icon ───────────────────────────────────────────────────────────────
  function StepIcon({ status }: { status: StepStatus }) {
    if (status === 'pending')
      return <span className="w-5 h-5 rounded-full border border-neutral-700 bg-neutral-800 flex-shrink-0" />
    if (status === 'running')
      return (
        <span className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0" />
      )
    if (status === 'done')
      return (
        <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )
    return (
      <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    )
  }

  // ── Upload zone ─────────────────────────────────────────────────────────────
  function UploadZone({
    slot,
    label,
    hint,
    fileSlot,
    inputRef,
  }: {
    slot: 'source' | 'template'
    label: string
    hint: string
    fileSlot: FileSlot
    inputRef: React.RefObject<HTMLInputElement | null>
  }) {
    const dragHandlers = makeDragHandlers(slot)
    const isDragging = fileSlot.state === 'dragging'
    const isReady = fileSlot.state === 'ready'

    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">{label}</p>
        <input
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          ref={inputRef}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFileAccepted(f, slot)
          }}
        />
        <div
          {...dragHandlers}
          className={[
            'relative h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 select-none',
            isReady
              ? 'border-emerald-600/60 bg-emerald-900/10 cursor-default'
              : isDragging
              ? 'border-blue-500/80 bg-blue-900/15 scale-[1.01]'
              : 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/30',
          ].join(' ')}
        >
          {isReady ? (
            <>
              <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-xs font-semibold text-emerald-400">File Ready</p>
              <p className="text-[10px] text-neutral-500 max-w-[180px] truncate text-center px-2">
                {fileSlot.file?.name}
              </p>
            </>
          ) : isDragging ? (
            <>
              <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xs font-medium text-blue-300">Drop to upload</p>
            </>
          ) : (
            <>
              <svg className="w-7 h-7 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs font-medium text-neutral-300">{hint}</p>
              <p className="text-[10px] text-neutral-600">Click or drag & drop · .xlsx only</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 font-sans flex flex-col">
      {/* ── Top nav ──────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 shrink-0 bg-neutral-900/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-neutral-500 hover:text-neutral-300 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-neutral-800">|</span>
          <h1 className="text-sm font-semibold text-neutral-200 tracking-tight">Attendance Format Converter</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-900/20 border border-emerald-800/40 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">PDPA · Secure</span>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl flex flex-col gap-6">

          {/* Title block */}
          <div>
            <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold mb-1">On3oard Pte Ltd · PNH Group</p>
            <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">NHGP Attendance Converter</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Transform PNH Group attendance data into the NHGP submission timesheet format.
            </p>
          </div>

          {/* ── Upload panel ────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col gap-5">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">Step 1 — Upload Files</p>

            <div className="grid grid-cols-2 gap-4">
              <UploadZone
                slot="source"
                label="Source File"
                hint="PNH Attendance Submission (.xlsx)"
                fileSlot={source}
                inputRef={sourceInputRef}
              />
              <UploadZone
                slot="template"
                label="NHGP Blank Template"
                hint="NHGP Original Format Timesheet (.xlsx)"
                fileSlot={template}
                inputRef={templateInputRef}
              />
            </div>

            {globalError && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-red-800/40 bg-red-900/15">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-red-300">{globalError}</p>
              </div>
            )}
            
            {/* AI Pre-Flight Panel */}
            {isValidating && (
              <div className="h-20 flex flex-col items-center justify-center border border-neutral-800 rounded-xl bg-neutral-900/40 animate-pulse">
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">AI Scanning Source File...</p>
              </div>
            )}
            
            {validation && !isValidating && (
              <AiInsightPanel 
                type="pre-flight"
                title="AI Pre-Flight Health Report"
                summary={validation.success ? `Scan complete. Found ${validation.meta?.employeeCount || 0} employees across ${validation.meta?.sheetCount || 0} sheets.` : 'Pre-flight scan failed.'}
                checks={validation.checks}
              />
            )}
          </div>

          {/* ── Progress panel ───────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">Step 2 — Convert</p>
              {/* Progress bar */}
              <div className="w-40 h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      steps.filter(s => s.status === 'done').length / steps.length * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <StepIcon status={step.status} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${step.status === 'pending' ? 'text-neutral-600' : 'text-neutral-300'}`}>
                      {step.label}
                    </p>
                    {step.detail && (
                      <p className="text-[10px] text-neutral-500 mt-0.5">{step.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-1">
              <button
                id="btn-convert"
                disabled={!canConvert}
                onClick={handleConvert}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
              >
                {isConverting && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isConverting ? 'Converting…' : 'Run Conversion'}
              </button>
              {(source.file || template.file) && (
                <button
                  onClick={handleReset}
                  disabled={isConverting}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-700 disabled:opacity-40 transition-all duration-150"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* ── Output panel ─────────────────────────────────────────────────── */}
          {outputBase64 && (
            <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/10 p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-widest">Step 3 — Download</p>

              {stats && (
                <div className="flex gap-6">
                  <div>
                    <p className="text-2xl font-bold text-neutral-100 font-mono">{stats.employees}</p>
                    <p className="text-[11px] text-neutral-500 uppercase tracking-widest mt-0.5">Employees</p>
                  </div>
                  <div className="w-px bg-neutral-800" />
                  <div>
                    <p className="text-2xl font-bold text-neutral-100 font-mono">{stats.days}</p>
                    <p className="text-[11px] text-neutral-500 uppercase tracking-widest mt-0.5">Day Records</p>
                  </div>
                  <div className="w-px bg-neutral-800" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-400 font-mono">100%</p>
                    <p className="text-[11px] text-neutral-500 uppercase tracking-widest mt-0.5">MGF Confidence</p>
                  </div>
                </div>
              )}

              {errors.length > 0 && (
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto p-2 bg-black/20 rounded border border-neutral-800">
                  {errors.map((e, i) => (
                    <p key={i} className="text-[10px] text-yellow-400">⚠ {e}</p>
                  ))}
                </div>
              )}

              {insights && (
                <AiInsightPanel 
                  type="post-run"
                  title="AI Conversion Summary"
                  summary={insights.summary}
                  score={insights.score}
                />
              )}

              <button
                id="btn-download"
                onClick={handleDownload}
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all duration-150 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Converted File (.xlsx)
              </button>

              <p className="text-[10px] text-neutral-600 text-center">
                Temporary data purged from memory on page close. No PII retained. PDPA-compliant.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
