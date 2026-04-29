'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-neutral-100 p-4">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <pre className="bg-neutral-800 p-4 rounded border border-neutral-700 text-xs max-w-full overflow-auto mb-4">
        {error.message || "Unknown Error"}
      </pre>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-neutral-100 text-neutral-900 rounded hover:bg-white transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
