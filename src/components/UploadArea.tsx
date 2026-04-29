import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

type UploadState = 'Idle' | 'Uploading' | 'Ready';

interface UploadAreaProps {
  onFilesReady: (csvPath: string, excelPath: string) => void;
  onReset: () => void;
}

export function UploadArea({ onFilesReady, onReset }: UploadAreaProps) {
  const [csvState, setCsvState] = useState<UploadState>('Idle');
  const [excelState, setExcelState] = useState<UploadState>('Idle');
  const [csvPath, setCsvPath] = useState<string>('');
  const [excelPath, setExcelPath] = useState<string>('');
  
  const csvInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (csvPath && excelPath) {
      onFilesReady(csvPath, excelPath);
    }
  }, [csvPath, excelPath, onFilesReady]);

  const handleUpload = async (file: File, typeOverride: 'csv' | 'excel' | null = null) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    let type: 'csv' | 'excel' = 'csv';
    
    if (fileExt === 'xlsx' || fileExt === 'xls') {
      type = typeOverride || 'csv';
    }

    const setState = type === 'csv' ? setCsvState : setExcelState;
    const setPath = type === 'csv' ? setCsvPath : setExcelPath;
    
    setState('Uploading');
    const path = `${Date.now()}_${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('raw_uploads')
      .upload(path, file, { upsert: true });

    if (error) {
      console.error('Upload error:', error);
      alert(`Upload Failed: ${error.message}`);
      setState('Idle');
    } else if (data) {
      setPath(data.path);
      setState('Ready');
    }
  };

  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (csvState !== 'Idle') return;
    const file = e.dataTransfer.files[0];
    const name = file?.name.toLowerCase();
    if (file && (name.endsWith('.xlsx') || name.endsWith('.xls'))) {
      handleUpload(file, 'csv');
    } else {
      alert('Please upload an Excel file (.xlsx) in Zone 1.');
    }
  };

  const handleExcelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (excelState !== 'Idle') return;
    const file = e.dataTransfer.files[0];
    const name = file?.name.toLowerCase();
    if (file && (name.endsWith('.xlsx') || name.endsWith('.xls'))) {
      handleUpload(file, 'excel');
    } else {
      alert('Please upload an Excel file (.xlsx) in Zone 2.');
    }
  };

  const resetAll = () => {
    setCsvState('Idle');
    setExcelState('Idle');
    setCsvPath('');
    setExcelPath('');
    onReset();
    if (csvInputRef.current) csvInputRef.current.value = '';
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Zone 1: Raw Timesheet (.xlsx) */}
        <div className="border border-neutral-800 rounded-lg p-1 bg-neutral-900/50">
          <input 
            type="file" 
            accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
            ref={csvInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) handleUpload(e.target.files[0], 'csv');
            }}
          />
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCsvDrop}
            onClick={() => csvState === 'Idle' && csvInputRef.current?.click()}
            className={`h-40 border border-dashed rounded-md p-4 text-center flex flex-col items-center justify-center transition-colors ${
              csvState === 'Idle' ? 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/30 cursor-pointer' :
              csvState === 'Uploading' ? 'border-blue-500/50 bg-blue-900/10' :
              'border-green-500/50 bg-green-900/10'
            }`}
          >
            {csvState === 'Idle' && (
              <>
                <svg className="w-8 h-8 text-neutral-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-neutral-200">Zone 1: Raw Timesheet</p>
                <p className="text-[11px] text-neutral-500 mt-1">Upload .xlsx file only</p>
              </>
            )}
            {csvState === 'Uploading' && (
              <>
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs font-medium text-blue-400">Uploading...</p>
              </>
            )}
            {csvState === 'Ready' && (
              <>
                <svg className="w-6 h-6 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="bg-neutral-800 px-2 py-1 rounded border border-neutral-700 text-green-400 text-[11px] font-medium flex items-center gap-1">
                  Raw Excel Ready
                </span>
                <p className="text-[10px] text-neutral-500 mt-2 truncate w-full px-2">{csvPath.split('_').pop()}</p>
              </>
            )}
          </div>
        </div>

        {/* Zone 2: Excel */}
        <div className="border border-neutral-800 rounded-lg p-1 bg-neutral-900/50">
          <input 
            type="file" 
            accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
            ref={excelInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) handleUpload(e.target.files[0], 'excel');
            }}
          />
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleExcelDrop}
            onClick={() => excelState === 'Idle' && excelInputRef.current?.click()}
            className={`h-40 border border-dashed rounded-md p-4 text-center flex flex-col items-center justify-center transition-colors ${
              excelState === 'Idle' ? 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/30 cursor-pointer' :
              excelState === 'Uploading' ? 'border-blue-500/50 bg-blue-900/10' :
              'border-green-500/50 bg-green-900/10'
            }`}
          >
            {excelState === 'Idle' && (
              <>
                <svg className="w-8 h-8 text-neutral-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm font-medium text-neutral-200">Zone 2: NHGP Template</p>
                <p className="text-[11px] text-neutral-500 mt-1">Upload .xlsx file only</p>
              </>
            )}
            {excelState === 'Uploading' && (
              <>
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs font-medium text-blue-400">Uploading...</p>
              </>
            )}
            {excelState === 'Ready' && (
              <>
                <svg className="w-6 h-6 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="bg-neutral-800 px-2 py-1 rounded border border-neutral-700 text-green-400 text-[11px] font-medium flex items-center gap-1">
                  Excel Ready
                </span>
                <p className="text-[10px] text-neutral-500 mt-2 truncate w-full px-2">{excelPath.split('_').pop()}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {(csvState !== 'Idle' || excelState !== 'Idle') && (
        <div className="flex justify-center mt-2">
           <button 
             onClick={resetAll}
             className="text-[11px] text-neutral-500 hover:text-neutral-300 underline"
           >
             Reset All Uploads
           </button>
        </div>
      )}
    </div>
  );
}
