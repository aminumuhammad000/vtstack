import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const webhooks = await db.webhooks.findAll();
    return NextResponse.json({
      success: true,
      data: {
        webhooks: webhooks.map(w => ({ ...w, _id: w.id })),
        pagination: { total: webhooks.length, page: 1, limit: 50 },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch webhooks' }, { status: 500 });
  }
}
