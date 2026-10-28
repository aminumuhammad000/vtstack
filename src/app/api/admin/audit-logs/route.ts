import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const logs = await db.auditLogs.findAll();
    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map(l => ({ ...l, _id: l.id })),
        pagination: { total: logs.length, page: 1, limit: 50 },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
