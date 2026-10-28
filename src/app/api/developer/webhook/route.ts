import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    success: true,
    data: { webhookUrl: user.webhookUrl || '', webhookActive: user.webhookActive },
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const { webhookUrl, webhookActive } = await req.json();
  await db.users.update(user.id, { webhookUrl, webhookActive });
  return NextResponse.json({ success: true, message: 'Webhook updated' });
}
