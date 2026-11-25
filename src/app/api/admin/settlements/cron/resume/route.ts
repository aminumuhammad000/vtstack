import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const settings = await db.systemSettings.get();
    await db.systemSettings.update({
      globalSettlement: {
        ...(settings?.globalSettlement || {}),
        cronPaused: false,
        cronPausedAt: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Settlement cron resumed' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to resume cron' }, { status: 500 });
  }
}
