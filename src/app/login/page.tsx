import { login } from './actions'
import { LayoutContainer } from '@/components/LayoutContainer'

export default async function LoginPage(props: {
  searchParams: Promise<{ message: string }>
}) {
  const searchParams = await props.searchParams

  return (
    <LayoutContainer title="PNH Authentication" showPdpaBadge={false}>
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-sm p-8 rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-neutral-800 rounded flex items-center justify-center font-bold text-neutral-400 text-sm tracking-tighter mb-4">
              PNH
            </div>
            <h1 className="text-xl font-semibold text-neutral-200">Secure Login</h1>
            <p className="text-sm text-neutral-500 mt-2">Authorized personnel only.</p>
          </div>

          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider" htmlFor="email">
                Email
              </label>
              <input
                className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm text-neutral-200 focus:outline-none focus:border-neutral-500 transition-colors placeholder-neutral-600 font-mono"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider" htmlFor="password">
                Password
              </label>
              <input
                className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm text-neutral-200 focus:outline-none focus:border-neutral-500 transition-colors placeholder-neutral-600 font-mono"
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>

            {searchParams?.message && (
              <div className="p-3 bg-red-900/20 border border-red-800/50 rounded text-sm text-red-400 text-center">
                {searchParams.message}
              </div>
            )}

            <button
              formAction={login}
              className="mt-4 px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-900 text-sm font-medium rounded-md transition-colors w-full"
            >
              Sign In
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-neutral-800 text-center">
             <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-medium text-green-400 tracking-wide uppercase">PDPA Secure Environment</span>
              </div>
              <p className="text-xs text-neutral-600">Access is strictly monitored.</p>
          </div>
        </div>
      </div>
    </LayoutContainer>
  )
}
