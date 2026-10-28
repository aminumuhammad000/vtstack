import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const recent = await db.communications.findAll();
    return NextResponse.json({ success: true, data: recent.map(r => ({ ...r, _id: r.id })) });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch communications' }, { status: 500 });
  }
}
