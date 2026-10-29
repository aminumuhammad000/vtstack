import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { reason, ipWhitelist } = await req.json();
    const cleanIps = Array.isArray(ipWhitelist)
      ? ipWhitelist
      : typeof ipWhitelist === 'string'
      ? ipWhitelist.split(',').map((ip: string) => ip.trim()).filter(Boolean)
      : [];

    await db.users.update(authUser.id, {
      payoutRequestStatus: 'pending',
      payoutRequestReason: reason || 'Merchant Payout API Access Request',
      payoutIpWhitelist: cleanIps,
    });

    return NextResponse.json({
      success: true,
      message: 'Payout access request submitted successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to submit payout request' }, { status: 500 });
  }
}
