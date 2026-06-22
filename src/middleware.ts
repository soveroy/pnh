import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Maintenance | PNH AI Hub</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0a0a0a;
          color: #ededed;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .card {
          text-align: center;
          padding: 2.5rem;
          background-color: #141414;
          border: 1px solid #222;
          border-radius: 12px;
          max-width: 440px;
          width: 90%;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        h1 {
          font-size: 1.75rem;
          margin: 0 0 1rem;
          color: #fff;
          font-weight: 600;
          letter-spacing: -0.025em;
        }
        p {
          color: #a0a0a0;
          font-size: 0.95rem;
          line-height: 1.6;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>PNH AI Hub</h1>
        <p>The platform has been temporarily suspended. All activities are stopped until further notice. Please contact the administrator for details.</p>
      </div>
    </body>
    </html>`,
    {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  )
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

