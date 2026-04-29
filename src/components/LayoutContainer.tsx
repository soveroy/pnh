import React, { ReactNode } from 'react';

interface LayoutContainerProps {
  children: ReactNode;
  title: string;
  showPdpaBadge?: boolean;
}

export function LayoutContainer({ children, title, showPdpaBadge = false }: LayoutContainerProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 shrink-0 bg-neutral-900">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-sm tracking-tight text-neutral-200">{title}</h1>
        </div>
        {showPdpaBadge && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-900/20 border border-green-800/50 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-medium text-green-400 tracking-wide uppercase">PDPA Status: Secure Environment</span>
          </div>
        )}
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
