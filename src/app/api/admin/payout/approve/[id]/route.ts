import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await db.users.update(id, {
      isPayoutEnabled: true,
      payoutRequestStatus: 'approved',
    });

    return NextResponse.json({ success: true, message: 'Payout access approved' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to approve payout request' }, { status: 500 });
  }
}
