import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const txs = await db.transactions.findAll();
    const settlements = txs.filter(t => t.category === 'settlement' || t.category === 'deposit').map(t => ({
      ...t,
      _id: t.id,
      amount: t.amount,
      netAmount: Math.max(0, t.amount - (t.fee || 0)),
      settlementStatus: t.isCleared ? 'COMPLETED' : 'PENDING',
    }));

    return NextResponse.json({ success: true, data: settlements });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch settlements' }, { status: 500 });
  }
}
