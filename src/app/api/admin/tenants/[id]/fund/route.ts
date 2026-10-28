import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { amount, reason } = await req.json();

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    const wallet = await db.wallets.findByUserId(id);
    if (!wallet) return NextResponse.json({ success: false, message: 'Wallet not found' }, { status: 404 });

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = balanceBefore + numericAmount;

    await db.wallets.update(wallet.id, {
      balance: balanceAfter,
      clearedBalance: (Number(wallet.clearedBalance) || 0) + numericAmount,
    });

    await db.transactions.create({
      userId: id,
      walletId: wallet.id,
      type: 'credit',
      category: 'adjustment',
      amount: numericAmount,
      balanceBefore,
      balanceAfter,
      narration: reason || 'Admin wallet funding',
      status: 'success',
      reference: `ADMFUND-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    });

    return NextResponse.json({ success: true, message: 'Wallet funded successfully', data: { newBalance: balanceAfter } });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fund wallet' }, { status: 500 });
  }
}
