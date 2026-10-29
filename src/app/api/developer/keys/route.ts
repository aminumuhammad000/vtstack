import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = await db.users.findById(authUser.id) || authUser;
    const liveApiKey = user.liveApiKey || user.apiKey || `vtp_live_${user.id.replace(/-/g, '').substring(0, 20)}`;
    const testApiKey = user.testApiKey || `vtp_test_${user.id.replace(/-/g, '').substring(0, 20)}`;

    return NextResponse.json({
      success: true,
      data: {
        apiKey: liveApiKey,
        liveApiKey,
        testApiKey,
      },
    });
  } catch (error: any) {
    console.error('[API:DeveloperKeys GET error]:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const randomStr = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    const liveApiKey = `vtp_live_${randomStr}`;
    const testApiKey = `vtp_test_${randomStr}`;

    await db.users.update(authUser.id, {
      liveApiKey,
      testApiKey,
      apiKey: liveApiKey,
    });

    return NextResponse.json({
      success: true,
      message: 'API key generated successfully',
      data: {
        apiKey: liveApiKey,
        liveApiKey,
        testApiKey,
      },
    });
  } catch (error: any) {
    console.error('[API:DeveloperKeys POST error]:', error);
    return NextResponse.json({ success: false, message: 'Failed to generate API key' }, { status: 500 });
  }
}
