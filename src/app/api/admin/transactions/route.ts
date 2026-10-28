import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const transactions = await db.transactions.findAll();
    const formatted = transactions.map(t => ({
      ...t,
      _id: t.id,
    }));

    return NextResponse.json({
      success: true,
      data: {
        transactions: formatted,
        total: formatted.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch transactions' }, { status: 500 });
  }
}
