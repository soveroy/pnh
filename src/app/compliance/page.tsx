import { LayoutContainer } from '@/components/LayoutContainer';

export const runtime = 'edge';

export default function CompliancePage() {
  return (
    <LayoutContainer title="Privacy, Security & Compliance" showPdpaBadge={true}>
      <div className="flex flex-col gap-8 h-full pb-10">
        
        {/* Top Banner section */}
        <section className="p-8 rounded-lg border border-neutral-800 bg-neutral-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 blur-3xl rounded-full -ml-16 -mb-16" />
          
          <div className="relative z-10">
            <span className="px-3 py-1 rounded-full bg-emerald-950/50 text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-800/40">
              PNH Group Standard Policy
            </span>
            <h2 className="text-2xl font-bold text-neutral-100 mt-4 mb-3">
              Responsible & Secure Enterprise AI Operations
            </h2>
            <p className="text-sm text-neutral-400 max-w-3xl leading-relaxed">
              PNH AI Hub is engineered with absolute respect for data confidentiality, strict compliance with the 
              <strong> Singapore Personal Data Protection Act (PDPA)</strong>, and a core commitment to the 
              <strong> Human-in-the-Loop (HITL)</strong> governance model. All agentic tools running in this ecosystem function as secure co-pilots, elevating employee capability while keeping final business authority in human hands.
            </p>
          </div>
        </section>

        {/* Three Core Pillars Grid */}
        <section>
          <h3 className="text-sm font-semibold text-neutral-400 mb-6 uppercase tracking-widest">
            Three Pillars of our Compliance Framework
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pillar 1 */}
            <div className="p-6 rounded-lg border border-neutral-800 bg-neutral-900/30 flex flex-col h-full hover:border-neutral-700/60 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center mb-5 shrink-0">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-neutral-200 mb-3">
                1. Local Sandboxing & PDPA Compliance
              </h4>
              <p className="text-sm text-neutral-400 leading-relaxed flex-grow">
                Confidentiality is built directly into our client-side software architecture. All document reading, text extraction, optical character recognition (OCR), and biometric timesheet analysis execute <strong>locally in the user's browser sandbox</strong>. 
              </p>
              <div className="border-t border-neutral-800/80 pt-4 mt-5 text-xs text-neutral-500">
                • Zero leakage to public models <br />
                • In-browser memory execution <br />
                • Full compliance with PDPA guidelines
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-lg border border-neutral-800 bg-neutral-900/30 flex flex-col h-full hover:border-neutral-700/60 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center mb-5 shrink-0">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-neutral-200 mb-3">
                2. Human-in-the-Loop Mandate
              </h4>
              <p className="text-sm text-neutral-400 leading-relaxed flex-grow">
                Under PNH Group's operational framework, agentic AI co-pilots process complex calculations and present recommendations, but are <strong>physically blocked from committing decisions autonomously</strong>. Every action requires a verified user review.
              </p>
              <div className="border-t border-neutral-800/80 pt-4 mt-5 text-xs text-neutral-500">
                • Mandatory human payment release <br />
                • Manual draft email dispatch <br />
                • Editable field adjustments for errors
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-lg border border-neutral-800 bg-neutral-900/30 flex flex-col h-full hover:border-neutral-700/60 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-blue-950/40 border border-blue-800/40 flex items-center justify-center mb-5 shrink-0">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-neutral-200 mb-3">
                3. Enterprise Security & Session Shielding
              </h4>
              <p className="text-sm text-neutral-400 leading-relaxed flex-grow">
                Our application integrates a robust suite of defenses to safeguard enterprise assets. Security middleware protects routes from unauthorized access, while client-side copy restraints and visually weighted mathematical auditors protect documents.
              </p>
              <div className="border-t border-neutral-800/80 pt-4 mt-5 text-xs text-neutral-500">
                • Supabase session verification <br />
                • Text selection copy prevention <br />
                • Visual mutation total correction
              </div>
            </div>

          </div>
        </section>

        {/* Workflow specific guardrails */}
        <section className="p-6 rounded-lg border border-neutral-800 bg-neutral-900/20">
          <h3 className="text-base font-semibold text-neutral-200 mb-4">
            Security & HITL Integration by Tool
          </h3>
          <div className="space-y-4">
            
            <div className="flex items-start gap-4 p-4 rounded-md bg-neutral-950/40 border border-neutral-900">
              <div className="px-2.5 py-1 bg-cyan-950 text-cyan-400 text-xs font-bold rounded uppercase shrink-0 border border-cyan-900/50">
                Finance 3-Way Match
              </div>
              <div>
                <h5 className="text-sm font-semibold text-neutral-300 mb-1">Local OCR and Verification Shielding</h5>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Extracts dates, line item quantities, and pricing decimals locally using a high-density canvas scaling pipeline. Copy prevention blocks raw text scraping of sensitive pricing spreadsheets, while a visually-weighted edit distance algorithm automatically detects visual digit swaps. Programmatic "Copy to Clipboard" buttons track transfers securely, and payment recommendations (APPROVED/HOLD) cannot bypass manual director validation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-md bg-neutral-950/40 border border-neutral-900">
              <div className="px-2.5 py-1 bg-neutral-800 text-neutral-300 text-xs font-bold rounded uppercase shrink-0 border border-neutral-700/30">
                HR Timesheets & OT
              </div>
              <div>
                <h5 className="text-sm font-semibold text-neutral-300 mb-1">Local Biometric Parsing and Eligibility Audits</h5>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Field worker GPS track logs and timesheets are parsed inside the local browser context to protect personal identification records from public cloud models. The system highlights anomalies and shortfalls against official NHGP templates but requires the HR manager's explicit review and confirmation before exporting final conversion sheets.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-md bg-neutral-950/40 border border-neutral-900">
              <div className="px-2.5 py-1 bg-emerald-950 text-emerald-400 text-xs font-bold rounded uppercase shrink-0 border border-emerald-900/50">
                Onboard Morning Brief
              </div>
              <div>
                <h5 className="text-sm font-semibold text-neutral-300 mb-1">Executive Briefing Aggregator Sandbox</h5>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Aggregates operational logs, safety briefs, and procurement status cards inside a sandboxed domain. All aggregated summaries are prepared as an advisory draft, and the executive team holds the final review to confirm briefing points before morning stand-ups.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Warning Policy Box */}
        <section className="p-6 rounded-lg border border-red-900/30 bg-red-950/10 flex gap-4 items-start">
          <svg className="w-6 h-6 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-red-400 mb-1">Critical Operational Warning for Staff</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Under PNH Group corporate governance, attempting to bypass human-in-the-loop review checks by automating final payment routing or email releases through unapproved scripts is a direct violation of internal audit regulations. Staff are strictly required to verify all recommendation flags and exception indicators before releasing GIRO payments or submitting timesheets to clients.
            </p>
          </div>
        </section>

      </div>
    </LayoutContainer>
  );
}
