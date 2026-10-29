import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { sendPayoutApprovedEmail } from '@/lib/email/resend';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existingUser = await db.users.findById(id);
    if (!existingUser) return NextResponse.json({ success: false, message: 'Tenant not found' }, { status: 404 });

    await db.users.update(id, {
      isPayoutEnabled: true,
      payoutRequestStatus: 'approved',
    });

    try {
      const name = existingUser.firstName || existingUser.fullName || existingUser.businessName || 'Valued Partner';
      await sendPayoutApprovedEmail(existingUser.email, name);
      console.log(`[Email:Payout] Sent payout approval email to ${existingUser.email}`);
    } catch (emailErr) {
      console.error('[Email:Payout] Failed to send payout approval email:', emailErr);
    }

    return NextResponse.json({ success: true, message: 'Payout access approved' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to approve payout request' }, { status: 500 });
  }
}
