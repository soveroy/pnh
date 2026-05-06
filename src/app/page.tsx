import Link from 'next/link';
export const runtime = 'edge';
import { LayoutContainer } from '@/components/LayoutContainer';

export default function HubDashboard() {
  return (
    <LayoutContainer title="PNH AI Hub" showPdpaBadge={false}>
      <div className="flex flex-col gap-8 h-full">
        <section>
          <h2 className="text-sm font-medium text-neutral-300 mb-4 uppercase tracking-wider">Available Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Link href="/hr-timesheets" className="group block">
              <div className="p-6 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer h-full flex flex-col">
                <div className="w-10 h-10 rounded-md bg-neutral-800 flex items-center justify-center mb-4 group-hover:bg-neutral-700 transition-colors">
                  <svg className="w-5 h-5 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-neutral-200 mb-2">HR Timesheets Reconciliation</h3>
                <p className="text-sm text-neutral-400 flex-1">
                  Automate the matching and verification of field worker GPS logs into official NHGP attendance templates.
                </p>
                <div className="mt-6 flex items-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Launch Tool &rarr;
                </div>
              </div>
            </Link>
            
            <Link href="/attendance-converter" className="group block">
              <div className="p-6 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer h-full flex flex-col">
                <div className="w-10 h-10 rounded-md bg-neutral-800 flex items-center justify-center mb-4 group-hover:bg-neutral-700 transition-colors">
                  <svg className="w-5 h-5 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-neutral-200 mb-2">Attendance Format Converter</h3>
                <p className="text-sm text-neutral-400 flex-1">
                  Transform PNH Group attendance data into the NHGP submission timesheet format for manpower claims.
                </p>
                <div className="mt-6 flex items-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Launch Tool &rarr;
                </div>
              </div>
            </Link>

            <Link href="/ot-verification" className="group block">
              <div className="p-6 rounded-lg border border-amber-900/40 bg-amber-950/20 hover:bg-amber-900/20 hover:border-amber-800/60 transition-all cursor-pointer h-full flex flex-col">
                <div className="w-10 h-10 rounded-md bg-amber-900/30 flex items-center justify-center mb-4 group-hover:bg-amber-900/50 transition-colors">
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-neutral-200 mb-2">HR Hard Service — DST & Minor OT Allowance Integrated Verification</h3>
                <p className="text-sm text-neutral-400 flex-1">
                  Validate DST and MINOR OT allowance claims against HR attendance timesheets for PNHR, PFS, and GM. Applies full SOP eligibility rules and flags all discrepancies.
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 text-[10px] font-semibold uppercase tracking-widest border border-amber-800/40">Hard Services</span>
                  <span className="text-xs font-medium text-amber-600 uppercase tracking-wider ml-auto">Launch Tool &rarr;</span>
                </div>
              </div>
            </Link>

          </div>
        </section>
      </div>
    </LayoutContainer>
  );
}
