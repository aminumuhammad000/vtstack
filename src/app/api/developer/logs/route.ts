import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { extractClientIp } from '@/lib/webhookDispatcher';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));

    // Fetch all logs for this user with applied filters
    const allFilteredLogs = await db.logs.findByUserId(user.id, { type, status, search });
    
    // Also fetch raw total to calculate accurate KPI stats
    const allUserLogs = await db.logs.findByUserId(user.id);

    const total = allFilteredLogs.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedLogs = allFilteredLogs.slice(startIndex, startIndex + limit);

    // KPI stats across all user events
    const successCount = allUserLogs.filter((l: any) => l.status === 'success').length;
    const failedCount = allUserLogs.filter((l: any) => l.status === 'failed').length;
    const totalDurations = allUserLogs.reduce((acc: number, l: any) => acc + (Number(l.duration) || 0), 0);
    const avgDuration = allUserLogs.length > 0 ? Math.round(totalDurations / allUserLogs.length) : 0;
    
    const uniqueIpsSet = new Set<string>();
    allUserLogs.forEach((l: any) => {
      if (l.ipAddress) uniqueIpsSet.add(l.ipAddress);
    });

    const clientIp = extractClientIp(req);

    return NextResponse.json({
      success: true,
      data: {
        logs: paginatedLogs,
        stats: {
          total: allUserLogs.length,
          filteredTotal: total,
          successCount,
          failedCount,
          avgDuration,
          uniqueIps: uniqueIpsSet.size,
          webhookUrl: user.webhookUrl || '',
          webhookActive: user.webhookActive ?? true,
          clientIp,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    console.error('[API Developer Logs GET Error]:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve logs' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await db.logs.deleteByUserId(user.id);
    return NextResponse.json({ success: true, message: 'Activity and webhook logs cleared successfully' });
  } catch (error: any) {
    console.error('[API Developer Logs DELETE Error]:', error);
    return NextResponse.json({ success: false, message: 'Failed to clear logs' }, { status: 500 });
  }
}
