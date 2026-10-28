import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { reason } = await req.json();

    await db.users.update(id, {
      isPayoutEnabled: false,
      payoutRequestStatus: 'rejected',
      payoutRequestReason: reason || 'Not eligible',
    });

    return NextResponse.json({ success: true, message: 'Payout access rejected' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to reject payout request' }, { status: 500 });
  }
}
