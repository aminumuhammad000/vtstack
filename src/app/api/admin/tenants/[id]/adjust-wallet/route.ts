import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { amount, type, narration } = await req.json();

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    const wallet = await db.wallets.findByUserId(id);
    if (!wallet) return NextResponse.json({ success: false, message: 'Wallet not found' }, { status: 404 });

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = type === 'debit' ? Math.max(0, balanceBefore - numericAmount) : balanceBefore + numericAmount;

    await db.wallets.update(wallet.id, {
      balance: balanceAfter,
      clearedBalance: type === 'debit' ? Math.max(0, (Number(wallet.clearedBalance) || 0) - numericAmount) : (Number(wallet.clearedBalance) || 0) + numericAmount,
    });

    await db.transactions.create({
      userId: id,
      walletId: wallet.id,
      type: type === 'debit' ? 'debit' : 'credit',
      category: 'adjustment',
      amount: numericAmount,
      balanceBefore,
      balanceAfter,
      narration: narration || `Admin wallet adjustment (${type})`,
      status: 'success',
      reference: `ADMADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    });

    return NextResponse.json({ success: true, message: 'Wallet adjusted successfully', data: { newBalance: balanceAfter } });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to adjust wallet' }, { status: 500 });
  }
}
