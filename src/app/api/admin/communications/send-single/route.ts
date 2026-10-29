import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { sendEmail } from '@/lib/email/resend';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { userId, subject, message } = await req.json();
    const recipient = await db.users.findById(userId);

    const created = await db.communications.create({
      type: 'single',
      userId,
      subject,
      message,
      sentBy: admin.email,
    });

    if (recipient?.email) {
      await sendEmail({
        to: recipient.email,
        subject: `[VTStack Notification] ${subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-top: 0;">${subject}</h2>
            <div style="color: #334155; line-height: 1.6; white-space: pre-line;">${message}</div>
            <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">Sent by VTStack Administrator (${admin.email})</p>
          </div>
        `,
        text: message,
      });
    }

    return NextResponse.json({ success: true, message: 'Message sent successfully', data: created });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to send message' }, { status: 500 });
  }
}
