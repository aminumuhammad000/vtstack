import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const tenants = await db.users.findTenants();
    const keys = tenants.filter(t => t.liveApiKey || t.testApiKey).map(t => ({
      _id: t.id,
      id: t.id,
      userId: t.id,
      merchantName: t.businessName || `${t.firstName} ${t.lastName}`,
      email: t.email,
      liveKey: t.liveApiKey || 'vtp_live_' + t.id.substring(0, 16),
      testKey: t.testApiKey || 'vtp_test_' + t.id.substring(0, 16),
      status: t.status,
      createdAt: t.createdAt,
    }));

    return NextResponse.json({ success: true, data: keys });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const userId = body.userId || body.id;
    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const liveKey = `vtp_live_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const testKey = `vtp_test_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

    await db.users.update(userId, { liveApiKey: liveKey, testApiKey: testKey, apiKey: liveKey });

    return NextResponse.json({
      success: true,
      message: 'API Key generated successfully',
      data: {
        id: userId,
        _id: userId,
        liveKey,
        testKey,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API:AdminApiKeys error]:', error);
    return NextResponse.json({ success: false, message: 'Failed to generate API key' }, { status: 500 });
  }
}
