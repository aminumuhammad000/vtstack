import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const [transactions, virtualAccounts, payouts, wallet] = await Promise.all([
      db.transactions.findByUserId(user.id),
      db.virtualAccounts.findByUserId(user.id),
      db.payouts.findByUserId(user.id),
      db.wallets.findByUserId(user.id),
    ]);

    let totalInflowNaira = 0;
    let totalOutflowNaira = 0;

    for (const tx of transactions) {
      if (tx.status === 'success') {
        if (tx.type === 'credit') {
          totalInflowNaira += Number(tx.amount || 0);
        } else if (tx.type === 'debit') {
          totalOutflowNaira += Number(tx.amount || 0);
        }
      }
    }

    const activeVirtualAccounts = virtualAccounts.filter(va => va.status === 'active').length;
    const pendingSettlements = payouts.filter(p => p.status === 'PROCESSING' || p.status === 'INITIATED' || p.status === 'LOCKED').length;

    return NextResponse.json({
      success: true,
      data: {
        totalInflowNaira,
        totalOutflowNaira,
        activeVirtualAccounts,
        pendingSettlements,
        balance: wallet?.balance || 0,
        clearedBalance: wallet?.clearedBalance || 0,
        lockedBalance: wallet?.lockedBalance || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching wallet stats:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch wallet stats' }, { status: 500 });
  }
}
