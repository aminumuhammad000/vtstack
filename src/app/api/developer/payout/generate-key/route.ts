import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const randomStr = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    const payoutSecretKey = `vtp_pay_sec_${randomStr}`;

    await db.users.update(authUser.id, {
      liveApiKey: payoutSecretKey,
    });

    return NextResponse.json({
      success: true,
      message: 'Payout secret key generated successfully',
      data: {
        payoutSecretKey,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to generate payout key' }, { status: 500 });
  }
}
