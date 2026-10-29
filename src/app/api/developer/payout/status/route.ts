import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = await db.users.findById(authUser.id) || authUser;

    return NextResponse.json({
      success: true,
      data: {
        payoutRequestStatus: user.payoutRequestStatus || 'none',
        payoutRequestReason: user.payoutRequestReason || '',
        payoutIpWhitelist: user.payoutIpWhitelist || [],
        hasPayoutKey: Boolean(user.liveApiKey),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch payout status' }, { status: 500 });
  }
}
