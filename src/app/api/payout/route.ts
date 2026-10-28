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
    return NextResponse.json({ success: false, message: 'Failed to fetch payouts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const amount = Number(body.amount);
    const fee = 50;

    const wallet = await db.wallets.findByUserId(user.id);
    if (!wallet || wallet.balance < amount + fee) {
      return NextResponse.json({ success: false, message: 'Insufficient wallet balance' }, { status: 400 });
    }

    const payout = await db.payouts.create({
      userId: user.id,
      amount,
      fee,
      totalDebit: amount + fee,
      bankCode: body.bankCode,
      accountNumber: body.accountNumber,
      accountName: body.accountName || 'Beneficiary',
      reference: `PO-${Date.now()}`,
      status: 'SUCCESS',
    });

    // Debit wallet
    await db.wallets.update(wallet.id, {
      balance: wallet.balance - (amount + fee),
      clearedBalance: wallet.clearedBalance - (amount + fee),
    });

    // Create transaction record
    await db.transactions.create({
      walletId: wallet.id,
      userId: user.id,
      type: 'debit',
      category: 'withdrawal',
      amount,
      fee,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance - (amount + fee),
      reference: payout.reference,
      narration: `Payout to ${body.accountName || 'Beneficiary'} (${body.accountNumber})`,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      message: 'Payout processed successfully',
      data: payout,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Payout failed' }, { status: 500 });
  }
}
