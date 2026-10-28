import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const tx = await db.transactions.findById(id);
    if (!tx) return NextResponse.json({ success: false, message: 'Transaction not found' }, { status: 404 });

    const updated = await db.transactions.update(id, { isCleared: true, status: 'success' });
    return NextResponse.json({ success: true, message: 'Transaction verified and settled', data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to verify transaction' }, { status: 500 });
  }
}
