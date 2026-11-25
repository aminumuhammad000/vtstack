import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountNumber: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { accountNumber } = await params;
    if (!accountNumber) {
      return NextResponse.json({ success: false, message: 'Account number is required' }, { status: 400 });
    }

    // Verify virtual account belongs to this user
    const virtualAccount = await db.virtualAccounts.findByAccountNumber(accountNumber);
    if (!virtualAccount || virtualAccount.userId !== user.id) {
      return NextResponse.json({ success: false, message: 'Virtual account not found or access denied' }, { status: 404 });
    }

    // Fetch user transactions and filter by this account
    const allUserTx = await db.transactions.findByUserId(user.id);
    const vaTransactions = allUserTx.filter(t => {
      const meta = t.metadata || {};
      return (
        meta.virtualAccountNo === accountNumber ||
        meta.virtualAccount === accountNumber ||
        meta.accountNumber === accountNumber ||
        t.narration?.includes(accountNumber) ||
        t.reference?.includes(accountNumber)
      );
    });

    return NextResponse.json({
      success: true,
      data: vaTransactions,
    });
  } catch (error: any) {
    console.error('[API VA Transactions Error]:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch virtual account transactions' }, { status: 500 });
  }
}
