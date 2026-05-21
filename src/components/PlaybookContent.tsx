'use client';

import React, { useState } from 'react';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function Accordion({ title, children, isOpen, onToggle }: AccordionProps) {
  return (
    <div className="border border-neutral-800/80 rounded-xl bg-black/25 overflow-hidden transition-all duration-200">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-neutral-800/20 active:bg-neutral-800/40 transition-colors"
      >
        <span className="text-sm font-semibold text-neutral-200">{title}</span>
        <svg
          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] border-t border-neutral-850 p-5' : 'max-h-0 overflow-hidden'
        }`}
      >
        <div className="text-sm text-neutral-400 space-y-3 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export function PlaybookContent() {
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setActiveAccordion(prev => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <p className="text-[11px] text-amber-500 uppercase tracking-widest font-semibold mb-1">
          Operations Manual &amp; HR Reference
        </p>
        <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">Hard Services OT Playbook</h2>
        <p className="text-sm text-neutral-400 mt-1.5 leading-relaxed">
          This interactive playbook guides PNH Human Resources and Operations teams on utilizing the automated OT Verification engine. Replace hours of manual Excel copy-pasting, visual cross-referencing, and rate verification with secure, audit-ready AI automation.
        </p>
      </div>

      {/* Before vs After Grid */}
      <div className="rounded-2xl border border-neutral-850 bg-neutral-900/40 p-5 flex flex-col gap-4">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
          ⚡ Operational Benefits: Manual vs. Automated
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500 font-semibold">
                <th className="py-3 px-4">Operational Task</th>
                <th className="py-3 px-4 text-red-400/90">🔴 Old Manual Process</th>
                <th className="py-3 px-4 text-emerald-400/90">🟢 New Automated Hub</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850 text-neutral-300">
              <tr>
                <td className="py-3.5 px-4 font-medium text-neutral-200">Timesheet Parsing</td>
                <td className="py-3.5 px-4 text-neutral-400">Opening 3 separate company files (PNHR, PFS, GM) and checking line by line.</td>
                <td className="py-3.5 px-4 bg-emerald-950/5 text-neutral-200 font-medium">Automatic multi-sheet scanner parses all files instantly.</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-neutral-200">SOP &amp; Rest Period Checking</td>
                <td className="py-3.5 px-4 text-neutral-400">Opening next-day attendance to manually verify continuous rest times.</td>
                <td className="py-3.5 px-4 bg-emerald-950/5 text-neutral-200 font-medium">Next-day cross-checks executed in milliseconds.</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-neutral-200">Designation &amp; Rate Audit</td>
                <td className="py-3.5 px-4 text-neutral-400">Manually matching worker names to role listings to check $15 vs $25 rates.</td>
                <td className="py-3.5 px-4 bg-emerald-950/5 text-neutral-200 font-medium">File D (Employee Listing) automatically overrides &amp; matches rates.</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-neutral-200">Photo Evidence Mapping</td>
                <td className="py-3.5 px-4 text-neutral-400">Manually looking up WhatsApp/email photos and matching filenames to dates.</td>
                <td className="py-3.5 px-4 bg-emerald-950/5 text-neutral-200 font-medium">Fuzzy-matches filenames and embeds clickable <span className="text-blue-400">"View Photo"</span> links.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* The 3 Golden SOP Conditions */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
          🛡️ The Three Golden SOP Conditions
        </h3>
        <p className="text-xs text-neutral-500">
          The engine runs an automated, non-biased verification sequence checking three strict operational parameters:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-black/20 border border-neutral-800/80 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-900/20 border border-amber-800/30 flex items-center justify-center text-amber-500 font-bold text-sm">A</div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wide">Day Shift check</h4>
              <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                Cleaner must have worked their regular day shift on that date. **Sundays are automatically exempted** from this requirement.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-black/20 border border-neutral-800/80 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/20 border border-emerald-800/30 flex items-center justify-center text-emerald-500 font-bold text-sm">B</div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wide">Night OT check</h4>
              <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                Cleaner must have worked past **02:00 AM** and logged at least **2 hours** of overnight overtime to be eligible.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-black/20 border border-neutral-800/80 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-900/20 border border-indigo-800/30 flex items-center justify-center text-indigo-500 font-bold text-sm">C</div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wide">Next-Day check</h4>
              <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                Cleaner must have registered clock-in attendance on the **following day** (before 10:00 AM) to verify rest compliance.
              </p>
            </div>
          </div>
        </div>

        {/* Public Holiday note */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-900/30 bg-amber-950/10">
          <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1 text-xs text-amber-300/90 leading-relaxed">
            <strong>Public Holiday Flagging:</strong> Claims matching recognized public holidays (e.g., Good Friday, April 3rd) are automatically tagged in the output with <code className="bg-black/40 px-1 py-0.5 rounded text-[10px] text-amber-400 font-mono">[Public Holiday – Manual Review]</code> to allow custom manual override rates if applicable.
          </div>
        </div>
      </div>

      {/* Upload Instructions Accordions */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
          📂 Guide to Upload Files &amp; Templates
        </h3>
        
        <div className="flex flex-col gap-3">
          <Accordion
            title="File A — Attendance Master Data"
            isOpen={activeAccordion === 'fileA'}
            onToggle={() => toggleAccordion('fileA')}
          >
            <p>
              Upload the consolidated biometric attendance workbook (typically named <strong>Attandance April-3companies.xlsx</strong>).
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-neutral-400">
              <li>Must contain sheets named exactly: <strong className="text-neutral-300">PNHR</strong>, <strong className="text-neutral-300">PFS</strong>, and <strong className="text-neutral-300">GM</strong>.</li>
              <li>Each sheet must have a header column starting with the word <strong className="text-neutral-300">"Details"</strong> (case-sensitive). Biometric punch logs are automatically parsed below this marker.</li>
              <li>Multi-clockings or split shifts on the same day are automatically grouped, summing hours and isolating the earliest clock-in and latest clock-out times.</li>
            </ul>
          </Accordion>

          <Accordion
            title="File B — Manager Claims List"
            isOpen={activeAccordion === 'fileB'}
            onToggle={() => toggleAccordion('fileB')}
          >
            <p>
              Upload the monthly claims spreadsheet submitted by site managers (typically named <strong>MINOR &amp; DST Attanance April.xlsx</strong>).
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-neutral-400">
              <li>Expected sheets: <strong className="text-neutral-300">DST-OT-NAMELIST</strong> and <strong className="text-neutral-300">MINOR-OT-NAMELIST</strong>.</li>
              <li>Contains the employee codes, employee names, claiming dates, and original days or amounts submitted.</li>
              <li>The engine automatically cross-references these names against attendance sheets using fuzzy character matching to identify typing errors.</li>
            </ul>
          </Accordion>

          <Accordion
            title="File C — HR Blank Template (Smart Format Support)"
            isOpen={activeAccordion === 'fileC'}
            onToggle={() => toggleAccordion('fileC')}
          >
            <p>
              Upload the clean, empty monthly template sheet (typically named <strong>OT_Allowance_blank.xlsx</strong>).
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-neutral-400">
              <li><strong>Dual Compatibility:</strong> You can upload either the DST template or the MINOR template.</li>
              <li>If you upload the <strong>DST template</strong>, the engine writes to the sheets <code className="text-[11px] font-mono text-emerald-400 bg-emerald-950/20 px-1 rounded">DST OT-NAMELIST</code> and <code className="text-[11px] font-mono text-emerald-400 bg-emerald-950/20 px-1 rounded">MINOR OT-NAMELIST</code>.</li>
              <li>If you upload the <strong>MINOR template</strong> (which internally holds a sheet named <code className="text-[11px] font-mono text-neutral-300">MINOR</code>), the engine automatically writes the claims and dynamically renames the tab to <code className="text-[11px] font-mono text-emerald-400 bg-emerald-950/20 px-1 rounded">MINOR OT-NAMELIST</code> in the final download, matching compliance guidelines.</li>
            </ul>
          </Accordion>

          <Accordion
            title="File D — Master Employee Listing (Highly Recommended)"
            isOpen={activeAccordion === 'fileD'}
            onToggle={() => toggleAccordion('fileD')}
          >
            <p>
              An optional authoritative listing (typically named <strong>EmployeeListing.xlsx</strong>) mapping employee codes to official roles.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-neutral-400">
              <li>Allows the system to automatically retrieve the authoritative role type.</li>
              <li>**Critical Driver Rate Correction:** Overrides incorrect designations in manager claim files. Ensures drivers are billed at the **$15/day** rate, and cleaners are billed at the **$25/day** rate.</li>
            </ul>
          </Accordion>

          <Accordion
            title="Evidence Photos — Fuzzy Date &amp; Name Matching"
            isOpen={activeAccordion === 'photos'}
            onToggle={() => toggleAccordion('photos')}
          >
            <p>
              Drag &amp; drop all site verification pictures (multi-select is supported).
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-neutral-400">
              <li><strong>Naming Standard:</strong> Format filenames as <strong className="text-neutral-300">CleanerName_MM-DD.jpg</strong> (e.g. <code className="text-[11px] font-mono bg-black/40 px-1 py-0.5 rounded text-neutral-300">Ahmad_04-15.jpg</code> or <code className="text-[11px] font-mono bg-black/40 px-1 py-0.5 rounded text-neutral-300">TanWei_2026-04-15.jpg</code>).</li>
              <li>The AI matches the worker's name (supporting fuzzy spelling) and the date against individual claim entries.</li>
              <li>Successfully matched photos are uploaded to secure storage, and a clickable hyperlinked cell saying <strong className="text-blue-400">"View Photo"</strong> is inserted directly next to that specific log in the output excel!</li>
            </ul>
          </Accordion>
        </div>
      </div>

      {/* Output Workbook Structure */}
      <div className="rounded-2xl border border-neutral-850 bg-neutral-900/40 p-5 flex flex-col gap-4">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
          📊 Understanding the 5-Sheet Output Workbook
        </h3>
        <p className="text-xs text-neutral-400">
          The verified Excel spreadsheet generated by the system contains the following tabs, pre-filled and formatted:
        </p>

        <div className="flex flex-col gap-3.5 mt-2">
          <div className="flex items-start gap-3">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-neutral-800 text-neutral-300 shrink-0 mt-0.5 border border-neutral-700">Tab 1</span>
            <div>
              <p className="text-xs font-semibold text-neutral-200">DST OT-NAMELIST &amp; MINOR OT-NAMELIST</p>
              <p className="text-[11px] text-neutral-500 mt-1">Official claim grids. Approved OT is marked as a <code className="bg-black/30 text-emerald-400 px-1 rounded font-mono">1</code> on the date column, with automatically calculated total days, sum amounts, and company affiliations written in.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 border-t border-neutral-850 pt-3">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-neutral-800 text-neutral-300 shrink-0 mt-0.5 border border-neutral-700">Tab 2</span>
            <div>
              <p className="text-xs font-semibold text-neutral-200">OT_ALLOWANCE_SUMMARY</p>
              <p className="text-[11px] text-neutral-500 mt-1">Executive reconciliation overview. Compares **Original Days/Amounts** submitted by managers against the **Calculated Days/Amounts** verified by AI, calculating net cost differences.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 border-t border-neutral-850 pt-3">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-neutral-800 text-neutral-300 shrink-0 mt-0.5 border border-neutral-700">Tab 3</span>
            <div>
              <p className="text-xs font-semibold text-neutral-200">OT_DETAIL_CHECK (Auditor Log)</p>
              <p className="text-[11px] text-neutral-500 mt-1">Granular log detailing every single checked shift. Explains the exact logic for approvals or rejections, next-day clocking status, and houses clickable **"View Photo"** links.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 border-t border-neutral-850 pt-3">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-neutral-800 text-neutral-300 shrink-0 mt-0.5 border border-neutral-700">Tab 4</span>
            <div>
              <p className="text-xs font-semibold text-neutral-200">CONFLICT_REPORT</p>
              <p className="text-[11px] text-neutral-500 mt-1">Lists resolved conflicts (e.g. employee claimed under both DST and MINOR on the same day), detailing the final calculated resolution applied to avoid duplicate billing.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 border-t border-neutral-850 pt-3">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-neutral-800 text-neutral-300 shrink-0 mt-0.5 border border-neutral-700">Tab 5</span>
            <div>
              <p className="text-xs font-semibold text-neutral-200">EXCEPTION_REPORT</p>
              <p className="text-[11px] text-neutral-500 mt-1">Flags anomalies requiring manual review (e.g. missing timesheet entries entirely, split clocking anomalies, or shifts starting after 5:00 AM).</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ / Troubleshooting */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
          ❓ FAQ &amp; Troubleshooting
        </h3>

        <div className="flex flex-col gap-3">
          <Accordion
            title="The tool flags a 'Missing Timesheet' exception. What does that mean?"
            isOpen={activeAccordion === 'faq1'}
            onToggle={() => toggleAccordion('faq1')}
          >
            <p>
              This means a cleaner had a claim entered by their manager on a date, but their employee code could not be found anywhere on that date inside the biometric attendance records (File A).
            </p>
            <p className="mt-2">
              <strong>HR Action:</strong> Check the raw attendance sheets to see if the worker forgot to clock in or registered under a different code, and manually adjust the downloaded verified sheet if appropriate.
            </p>
          </Accordion>

          <Accordion
            title="Why does it say 'No next-day attendance' when I know the cleaner worked?"
            isOpen={activeAccordion === 'faq2'}
            onToggle={() => toggleAccordion('faq2')}
          >
            <p>
              To ensure compliance with local rest guidelines, the SOP requires workers who work overnight to have a clock-in record on the following morning. If the next day was their scheduled rest day, or if they missed punch-in, this check will return a FAIL.
            </p>
            <p className="mt-2">
              <strong>HR Action:</strong> If the next day was a valid off-day or the cleaner has a manual attendance slip, HR can easily override the date cell to <code className="font-mono text-emerald-400 bg-emerald-950/20 px-1 rounded text-xs">1</code> and add the amount in the final Excel output.
            </p>
          </Accordion>

          <Accordion
            title="The pre-flight scan shows a sheet is missing inside File A. What should I check?"
            isOpen={activeAccordion === 'faq3'}
            onToggle={() => toggleAccordion('faq3')}
          >
            <p>
              Ensure the attendance Excel has tabs named exactly <strong className="text-neutral-300">PNHR</strong>, <strong className="text-neutral-300">PFS</strong>, and <strong className="text-neutral-300">GM</strong>. Double check that the spellings are exact with no extra spaces.
            </p>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
