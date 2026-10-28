import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { flagged } = await req.json();

    const updated = await db.transactions.update(id, { flagged: Boolean(flagged) });
    return NextResponse.json({ success: true, message: 'Transaction flag updated', data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update transaction' }, { status: 500 });
  }
}
