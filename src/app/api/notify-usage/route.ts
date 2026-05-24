import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const TOOL_LABELS: Record<string, string> = {
  'morning-briefing': 'On3oard AI Morning Briefing Workflow',
  'hr-timesheets': 'HR Timesheets Reconciliation',
  'attendance-converter': 'Attendance Format Converter',
  'finance-3way-match': 'Finance 3-Way Match & Reconciliation',
  'hard-services': 'HR Hard Service (OT Verification) AI Automation',
  'soft-services': 'HR Soft Service (Cleaners) AI Automation'
};

export async function POST(request: Request) {
  try {
    const { tool, action, status, errorMessage, meta } = await request.json();

    if (!tool || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Get authenticated user session from Supabase server context
    const supabase = await createClient();
    let userEmail = 'unauthenticated-session';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        userEmail = user.email;
      }
    } catch (e) {
      console.warn('Could not retrieve authenticated user session:', e);
    }

    // 2. Map standard tool identifier
    let dbToolType = tool;
    if (tool === 'ot-verification') dbToolType = 'hard-services';

    const toolLabel = TOOL_LABELS[dbToolType] || tool;

    // 3. Write to Supabase usage_audit_logs table
    try {
      const payload = {
        tool_type: dbToolType,
        action: action === 'page_visit' ? 'page_visit' : 'run_automation',
        status: status || 'success',
        error_message: errorMessage || null,
        meta: meta ? { ...meta, triggered_by_user: userEmail } : { triggered_by_user: userEmail }
      };

      const { error } = await supabase.from('usage_audit_logs').insert([payload]);
      if (error) {
        console.error('Supabase audit logging error:', error);
      }
    } catch (dbErr) {
      console.error('Database insertion failed:', dbErr);
    }

    // 4. Send email alert via Resend REST API if API Key is present
    const resendApiKey = process.env.RESEND_API_KEY;
    const notificationEmail = process.env.NOTIFICATION_EMAIL || 'admin@on3oard.com';

    if (resendApiKey) {
      const emailPayload = {
        from: 'PNH AI Hub Alerts <alerts@on3oard.com>',
        to: [notificationEmail],
        subject: `[AI Hub Alert] ${toolLabel} — ${action === 'page_visit' ? 'Page Visited' : `Executed (${(status || 'success').toUpperCase()})`}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f3f4f6; padding-bottom: 15px; margin-bottom: 20px;">
              <span style="font-weight: 800; font-size: 18px; color: #111827; letter-spacing: -0.025em;">PNH AI HUB</span>
              <span style="font-size: 10px; font-weight: bold; background-color: #10b981; color: #ffffff; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase;">Audit Secure</span>
            </div>
            
            <h2 style="color: #1f2937; font-size: 16px; font-weight: 700; margin: 0 0 15px 0;">AI Workflow Activity Alert</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #4b5563; width: 140px;">AI Tool</td>
                <td style="padding: 10px 0; font-size: 13px; color: #111827; font-weight: 500;">${toolLabel}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #4b5563;">Activity Type</td>
                <td style="padding: 10px 0; font-size: 13px; color: #111827;">
                  <span style="background-color: ${action === 'page_visit' ? '#eff6ff; color: #1d4ed8;' : status === 'error' ? '#fef2f2; color: #b91c1c;' : '#ecfdf5; color: #047857;'} ; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; border: 1px solid ${action === 'page_visit' ? '#bfdbfe;' : status === 'error' ? '#fecaca;' : '#a7f3d0;'}">
                    ${action === 'page_visit' ? 'Page Access' : `Execution ${status || 'success'}`}
                  </span>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #4b5563;">Active User</td>
                <td style="padding: 10px 0; font-size: 13px; color: #111827; font-family: ui-monospace, monospace;">${userEmail}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #4b5563;">Timestamp (SGT)</td>
                <td style="padding: 10px 0; font-size: 13px; color: #111827;">${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}</td>
              </tr>
              ${errorMessage ? `
              <tr>
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #dc2626;">Error Message</td>
                <td style="padding: 10px 0; font-size: 13px; color: #b91c1c; font-family: ui-monospace, monospace; word-break: break-all;">${errorMessage}</td>
              </tr>` : ''}
            </table>
            
            ${meta && Object.keys(meta).length > 0 ? `
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-top: 15px;">
              <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">Execution Payload / Metadata</h4>
              <pre style="margin: 0; font-family: ui-monospace, monospace; font-size: 11px; color: #4b5563; white-space: pre-wrap; word-break: break-all; overflow-x: auto; line-height: 1.5;">${JSON.stringify(meta, null, 2)}</pre>
            </div>` : ''}
            
            <div style="margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 15px; font-size: 10px; color: #9ca3af; text-align: center;">
              This is an automated alert from the PNH AI Hub Enterprise Audit System.<br/>
              Locally Sandboxed Workspace • PDPA Protected • HITL Governed
            </div>
          </div>
        `
      };

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify(emailPayload)
      });

      if (!resendRes.ok) {
        const errorText = await resendRes.text();
        console.error('Resend API error:', errorText);
      }
    } else {
      console.warn('RESEND_API_KEY not found in environment variables. Email notification skipped.');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Usage notification route error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
