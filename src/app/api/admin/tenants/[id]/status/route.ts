import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { sendAccountApprovedEmail } from '@/lib/email/resend';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { status } = await req.json();

    const existingUser = await db.users.findById(id);
    if (!existingUser) return NextResponse.json({ success: false, message: 'Tenant not found' }, { status: 404 });

    const updated = await db.users.update(id, { status });
    if (!updated) return NextResponse.json({ success: false, message: 'Tenant not found' }, { status: 404 });

    // Send email when admin approves / activates the user
    if (status === 'active' && existingUser.status !== 'active') {
      try {
        const name = existingUser.firstName || existingUser.fullName || existingUser.businessName || 'Valued Partner';
        await sendAccountApprovedEmail(existingUser.email, name);
        console.log(`[Email:Approval] Sent account approval email to ${existingUser.email}`);
      } catch (emailErr) {
        console.error('[Email:Approval] Failed to send approval email:', emailErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update status' }, { status: 500 });
  }
}
