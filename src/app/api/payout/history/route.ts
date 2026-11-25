import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const payouts = await db.payouts.findByUserId(user.id);
    return NextResponse.json({ success: true, data: payouts });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch payout history' }, { status: 500 });
  }
}
