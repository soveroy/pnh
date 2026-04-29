'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/login/actions';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 h-full border-r border-neutral-800 flex flex-col items-center py-4 shrink-0 bg-neutral-900">
      <div className="w-8 h-8 bg-neutral-800 rounded mb-8 flex items-center justify-center font-bold text-neutral-400 text-xs tracking-tighter">
        PNH
      </div>
      <nav className="flex flex-col gap-4 w-full px-2 flex-1">
        <Link 
          href="/" 
          className={`h-10 w-full rounded flex items-center justify-center transition-colors ${pathname === '/' ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'}`}
          title="Dashboard Hub"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Link>
        <Link 
          href="/hr-timesheets" 
          className={`h-10 w-full rounded flex items-center justify-center transition-colors ${pathname?.startsWith('/hr-timesheets') ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'}`}
          title="HR Timesheets Reconciliation"
        >
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </Link>
      </nav>
      
      {/* Sign Out Button */}
      <div className="w-full px-2 mt-auto pb-2">
        <form action={signOut}>
          <button 
            type="submit"
            className="w-full py-2 rounded flex flex-col items-center justify-center text-neutral-500 hover:bg-red-900/20 hover:text-red-400 transition-colors gap-1"
            title="Sign Out"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-[9px] uppercase tracking-wider font-semibold">Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
