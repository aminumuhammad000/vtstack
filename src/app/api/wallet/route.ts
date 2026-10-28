import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    let wallet = await db.wallets.findByUserId(user.id);
    if (!wallet) {
      wallet = await db.wallets.create({ userId: user.id, balance: 0, clearedBalance: 0, lockedBalance: 0 });
    }

    return NextResponse.json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch wallet' }, { status: 500 });
  }
}
