import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const tx = await db.transactions.findById(id);

    if (!tx || (tx.userId !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ success: false, message: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: tx,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch transaction' }, { status: 500 });
  }
}
