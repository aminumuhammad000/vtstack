import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { sendEmail } from '@/lib/email/resend';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { recipientType = 'all', selectedTenants = [], subject, message } = body;

    if (!subject || !message) {
      return NextResponse.json({ success: false, message: 'Subject and message are required' }, { status: 400 });
    }

    // 1. Fetch tenants
    const allTenants = await db.users.findTenants();

    // 2. Filter target tenants
    let targetTenants = allTenants;
    if (recipientType === 'active') {
      targetTenants = allTenants.filter(t => t.status === 'active');
    } else if (recipientType === 'inactive') {
      targetTenants = allTenants.filter(t => t.status !== 'active');
    } else if (recipientType === 'unverified') {
      targetTenants = allTenants.filter(t => (t.kycLevel || 0) < 3 || t.kyc_status !== 'verified');
    } else if (recipientType === 'specific') {
      targetTenants = allTenants.filter(t => selectedTenants.includes(t.id) || selectedTenants.includes((t as any)._id));
    }

    if (targetTenants.length === 0) {
      return NextResponse.json({ success: false, message: 'No recipients matched the selected criteria' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vtstack.ng';
    const supportEmail = 'support@vtstack.ng';
    const now = new Date().toISOString();

    // 3. Send email to each recipient
    let successCount = 0;
    let failCount = 0;

    for (const tenant of targetTenants) {
      if (!tenant.email) continue;
      const recipientName = tenant.firstName || tenant.fullName || tenant.businessName || 'Valued Partner';

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
              Go to Dashboard
            </a>
          </div>

          <div style="color: #64748b; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
            <p style="margin: 0 0 4px 0;">Need help? Reply to this email or reach us at <a href="mailto:${supportEmail}" style="color: #4f46e5;">${supportEmail}</a></p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} VTStack Systems (vtstack.ng). All rights reserved.</p>
          </div>
        </div>
      `;

      try {
        const sendRes = await sendEmail({
          to: tenant.email,
          subject: `[VTStack] ${subject}`,
          html,
          text: `Dear ${recipientName},\n\n${message}\n\nVTStack Team\n${supportEmail}`,
        });

        if (sendRes.success) {
          successCount++;
        } else {
          failCount++;
          console.warn(`[Communications:Send] Failed to send email to ${tenant.email}:`, sendRes.error);
        }

        // Also record this communication in the database for this user so it shows in their Support History
        await db.communications.create({
          senderId: admin.id,
          recipientId: tenant.id,
          userId: tenant.id,
          subject,
          message,
          type: 'email',
          status: sendRes.success ? 'sent' : 'failed',
          sentBy: admin.email,
          createdAt: now,
        });
      } catch (err: any) {
        failCount++;
        console.error(`[Communications:Send] Exception sending to ${tenant.email}:`, err.message);
      }
    }

    // 4. Record summary record in communications
    const summary = await db.communications.create({
      type: 'bulk',
      subject,
      message,
      recipientType,
      recipientCount: targetTenants.length,
      sentCount: successCount,
      failedCount: failCount,
      targetAudience: recipientType,
      sentBy: admin.email,
      sentAt: now,
      createdAt: now,
    });

    console.log(`[Communications:Bulk] Sent ${successCount}/${targetTenants.length} emails (failed: ${failCount})`);

    return NextResponse.json({
      success: true,
      message: `Email communication processed: ${successCount} sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      data: summary,
    });
  } catch (error: any) {
    console.error('[Communications:Send] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send bulk communication' }, { status: 500 });
  }
}
