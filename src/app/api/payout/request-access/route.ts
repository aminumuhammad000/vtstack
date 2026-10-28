import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { reason } = await req.json();
    await db.users.update(user.id, {
      payoutRequestStatus: 'pending',
      payoutRequestReason: reason || 'Business payouts',
    });

    return NextResponse.json({
      success: true,
      message: 'Payout access requested. Our team will review your application.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Request failed' }, { status: 500 });
  }
}
