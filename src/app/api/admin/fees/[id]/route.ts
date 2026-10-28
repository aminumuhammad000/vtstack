import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const data = await req.json();
    const updated = await db.fees.update(id, data);
    return NextResponse.json({ success: true, message: 'Fee updated', data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update fee' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await db.fees.delete(id);
    return NextResponse.json({ success: true, message: 'Fee deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to delete fee' }, { status: 500 });
  }
}
