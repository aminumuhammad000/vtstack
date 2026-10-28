import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { status } = await req.json();

    const updated = await db.users.update(id, {
      kyc_status: status,
      kycLevel: status === 'verified' ? 3 : 1,
    });
    if (!updated) return NextResponse.json({ success: false, message: 'Tenant not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'KYC status updated successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update KYC status' }, { status: 500 });
  }
}
