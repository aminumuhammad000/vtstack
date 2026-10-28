import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    success: true,
    data: {
      liveApiKey: user.liveApiKey || 'vtp_live_98a72b1c8f4d5e6a7b8c',
      testApiKey: user.testApiKey || 'vtp_test_12a34b5c6d7e8f9a0b1c',
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const randomStr = Math.random().toString(36).substring(2, 18);
  const liveApiKey = `vtp_live_${randomStr}`;
  const testApiKey = `vtp_test_${randomStr}`;

  await db.users.update(user.id, { liveApiKey, testApiKey });

  return NextResponse.json({
    success: true,
    message: 'API Keys regenerated',
    data: { liveApiKey, testApiKey },
  });
}
