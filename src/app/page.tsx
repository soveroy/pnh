import Link from 'next/link';
export const runtime = 'edge';
import { LayoutContainer } from '@/components/LayoutContainer';

export default function HubDashboard() {
  return (
    <LayoutContainer title="PNH AI Hub" showPdpaBadge={false}>
      <div className="flex flex-col gap-8 h-full">
        <section>
          <h2 className="text-sm font-medium text-neutral-300 mb-4 uppercase tracking-wider">AI Workflow Demos</h2>
          <div className="grid grid-cols-1 gap-6 mb-10">
            <Link href="/morning-briefing" className="group block">
              <div className="p-6 rounded-lg border border-emerald-900/40 bg-emerald-950/20 hover:bg-emerald-900/20 hover:border-emerald-800/60 transition-all cursor-pointer h-full flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="w-14 h-14 shrink-0 rounded-lg bg-emerald-900/30 flex items-center justify-center group-hover:bg-emerald-900/50 transition-colors">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-medium text-neutral-100 mb-2">On3oard AI Morning Briefing Workflow</h3>
                  <p className="text-sm text-neutral-400 max-w-2xl">
                    Live demo of the 7:00 AM executive briefing. Aggregates data from Operations, Procurement, Safety, and HR into a single, actionable status report.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                  <span className="px-3 py-1 rounded-full bg-emerald-900/40 text-emerald-400 text-[10px] font-semibold uppercase tracking-widest border border-emerald-800/40">New Demo</span>
                  <span className="text-sm font-medium text-emerald-500 uppercase tracking-wider ml-4 group-hover:translate-x-1 transition-transform">View Briefing &rarr;</span>
                </div>
              </div>
            </Link>
          </div>

          <h2 className="text-sm font-medium text-neutral-300 mb-4 uppercase tracking-wider">Management & Analytics</h2>
          <div className="mb-10">
            <Link href="/dashboard" className="group block">
              <div className="p-6 rounded-lg border border-indigo-900/40 bg-indigo-950/20 hover:bg-indigo-900/20 hover:border-indigo-800/60 transition-all cursor-pointer h-full flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="w-14 h-14 shrink-0 rounded-lg bg-indigo-900/30 flex items-center justify-center group-hover:bg-indigo-900/50 transition-colors">
                  <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-medium text-neutral-100 mb-2">PNH Group Management Dashboard</h3>
                  <p className="text-sm text-neutral-400 max-w-2xl">
                    Executive overview of the overnight ERP sync. Monitor cross-entity operations, AI-generated insights, HR reconciliation, safety compliance, and procurement matches.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                  <span className="px-3 py-1 rounded-full bg-indigo-900/40 text-indigo-400 text-[10px] font-semibold uppercase tracking-widest border border-indigo-800/40">CEO View</span>
                  <span className="text-sm font-medium text-indigo-500 uppercase tracking-wider ml-4 group-hover:translate-x-1 transition-transform">Enter Dashboard &rarr;</span>
                </div>
              </div>
            </Link>
          </div>

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

            <Link href="/soft-services" className="group block">
              <div className="p-6 rounded-lg border border-blue-900/40 bg-blue-950/20 hover:bg-blue-900/20 hover:border-blue-800/60 transition-all cursor-pointer h-full flex flex-col">
                <div className="w-10 h-10 rounded-md bg-blue-900/30 flex items-center justify-center mb-4 group-hover:bg-blue-900/50 transition-colors">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-neutral-200 mb-2">HR Soft Service (Cleaners) AI Automation</h3>
                <p className="text-sm text-neutral-400 flex-1">
                  Automate the NHGP monthly OT calculations for cleaners. Processes raw biometric logs into the official attendance template with automated shift & part-time detection.
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 text-[10px] font-semibold uppercase tracking-widest border border-blue-800/40">Soft Services</span>
                  <span className="text-xs font-medium text-blue-600 uppercase tracking-wider ml-auto">Launch Tool &rarr;</span>
                </div>
              </div>
            </Link>

          </div>
        </section>
      </div>
    </LayoutContainer>
  );
}
