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
        cronPaused: true,
        cronPausedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, message: 'Settlement cron paused' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to pause cron' }, { status: 500 });
  }
}
