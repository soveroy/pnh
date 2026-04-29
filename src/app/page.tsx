import Link from 'next/link';
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
            
            {/* Future Tool Placeholder */}
            <div className="p-6 rounded-lg border border-neutral-800 border-dashed bg-neutral-900/20 h-full flex flex-col justify-center items-center opacity-50">
               <div className="w-10 h-10 rounded-full border border-neutral-700 flex items-center justify-center mb-4">
                  <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-neutral-400">New Tool Coming Soon</h3>
            </div>

          </div>
        </section>
      </div>
    </LayoutContainer>
  );
}
