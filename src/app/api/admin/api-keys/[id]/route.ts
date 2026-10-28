import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await db.users.update(id, { liveApiKey: undefined, testApiKey: undefined });
    return NextResponse.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to revoke API key' }, { status: 500 });
  }
}
