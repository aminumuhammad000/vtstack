import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { sendEmail } from '@/lib/email/resend';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { userId, subject, message } = await req.json();
    if (!userId || !subject || !message) {
      return NextResponse.json({ success: false, message: 'userId, subject, and message are required' }, { status: 400 });
    }

    const recipient = await db.users.findById(userId);
    if (!recipient) {
      return NextResponse.json({ success: false, message: 'Recipient not found' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vtstack.ng';
    const supportEmail = 'support@vtstack.ng';
    const recipientName = recipient.firstName || recipient.fullName || recipient.businessName || 'Valued Partner';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="margin-bottom: 24px; text-align: center;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">VTStack</h1>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Next-Generation Virtual Accounts & Payments</p>
        </div>

        <div style="background: #f8fafc; border-radius: 10px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 12px 0; font-weight: 700;">${subject}</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0 0 16px 0;">Dear <strong>${recipientName}</strong>,</p>
          <div style="color: #334155; font-size: 14px; line-height: 1.7; white-space: pre-line;">
            ${message}
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${appUrl}/app" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px;">
            Open Dashboard
          </a>
        </div>

        <div style="color: #64748b; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
          <p style="margin: 0 0 4px 0;">Official communication from VTStack Operations &bull; <a href="mailto:${supportEmail}" style="color: #4f46e5;">${supportEmail}</a></p>
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} VTStack Systems (vtstack.ng). All rights reserved.</p>
        </div>
      </div>
    `;

    let emailSent = false;
    if (recipient.email) {
      const sendRes = await sendEmail({
        to: recipient.email,
        subject: `[VTStack Notification] ${subject}`,
        html,
        text: `Dear ${recipientName},\n\n${message}\n\nVTStack Team\n${supportEmail}`,
      });
      emailSent = sendRes.success;
      if (!emailSent) {
        console.warn(`[Communications:Single] Send failed:`, sendRes.error);
      }
    }

    const created = await db.communications.create({
      type: 'single',
      userId,
      recipientId: userId,
      senderId: admin.id,
      subject,
      message,
      sentBy: admin.email,
      status: emailSent ? 'sent' : 'failed',
    });

    return NextResponse.json({
      success: true,
      message: emailSent ? 'Message sent successfully' : 'Message logged to dashboard (email dispatch pending)',
      data: created,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to send message' }, { status: 500 });
  }
}
