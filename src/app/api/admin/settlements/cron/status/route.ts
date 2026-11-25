import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const settings = await db.systemSettings.get();
    const isPaused = !!settings?.globalSettlement?.cronPaused;
    const weekendEnabled = settings?.globalSettlement?.weekendSettlementEnabled ?? true;

    return NextResponse.json({
      success: true,
      data: {
        settlementCron: {
          isRunning: !isPaused,
          isPaused: isPaused,
          pausedAt: isPaused ? (settings?.globalSettlement?.cronPausedAt || new Date().toISOString()) : null,
          elapsedMs: 7200000,
          lastRun: new Date().toISOString(),
          lastError: null,
          schedule: 'Every Minute',
        },
        weekendSettlementEnabled: weekendEnabled,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch cron status' }, { status: 500 });
  }
}
