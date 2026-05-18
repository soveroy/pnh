import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showValue?: boolean;
}

export function ProgressBar({ progress, label, showValue = true }: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className="w-full flex flex-col gap-1.5">
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="text-neutral-400 font-medium">{label}</span>}
          {showValue && <span className="text-neutral-300 font-mono ml-auto">{clampedProgress}%</span>}
        </div>
      )}
      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
