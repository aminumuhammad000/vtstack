import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
      success: true,
      data: {
        active: true,
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 3600000).toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch cron status' }, { status: 500 });
  }
}
