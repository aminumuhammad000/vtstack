import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { sendKycApprovedEmail, sendKycRejectedEmail } from '@/lib/email/resend';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { status, reason } = await req.json();

    const existingUser = await db.users.findById(id);
    if (!existingUser) return NextResponse.json({ success: false, message: 'Tenant not found' }, { status: 404 });

    const newKycLevel = status === 'verified' ? 3 : 1;
    const updated = await db.users.update(id, {
      kyc_status: status,
      kycLevel: newKycLevel,
    });
    if (!updated) return NextResponse.json({ success: false, message: 'Tenant not found' }, { status: 404 });

    const name = existingUser.firstName || existingUser.fullName || existingUser.businessName || 'Valued Partner';

    if (status === 'verified') {
      try {
        await sendKycApprovedEmail(existingUser.email, name, newKycLevel);
        console.log(`[Email:KYC] Sent KYC approval email to ${existingUser.email}`);
      } catch (emailErr) {
        console.error('[Email:KYC] Failed to send KYC approval email:', emailErr);
      }
    } else if (status === 'rejected') {
      try {
        await sendKycRejectedEmail(existingUser.email, name, reason);
        console.log(`[Email:KYC] Sent KYC rejection email to ${existingUser.email}`);
      } catch (emailErr) {
        console.error('[Email:KYC] Failed to send KYC rejection email:', emailErr);
      }
    }

    return NextResponse.json({ success: true, message: 'KYC status updated successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update KYC status' }, { status: 500 });
  }
}
