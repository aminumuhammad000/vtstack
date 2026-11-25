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

    const balance = Number(wallet.balance) || 0;
    const clearedBalance = Number(wallet.clearedBalance) || 0;
    const lockedBalance = Number(wallet.lockedBalance) || 0;
    const availableBalanceNaira = clearedBalance > 0 ? clearedBalance : balance;

    return NextResponse.json({
      success: true,
      data: {
        ...wallet,
        balance,
        clearedBalance,
        lockedBalance,
        availableBalanceNaira,
        availableBalance: Math.round(availableBalanceNaira * 100),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch wallet' }, { status: 500 });
  }
}
