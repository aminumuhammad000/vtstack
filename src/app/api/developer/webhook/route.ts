import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    success: true,
    data: { webhookUrl: user.webhookUrl || '', webhookActive: user.webhookActive ?? true },
  });
}

async function handleSaveWebhook(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json().catch(() => ({}));
  const webhookUrl = body.webhookUrl !== undefined ? body.webhookUrl : user.webhookUrl;
  const webhookActive = body.webhookActive !== undefined ? body.webhookActive : (user.webhookActive ?? true);

  await db.users.update(user.id, { webhookUrl, webhookActive });

  return NextResponse.json({
    success: true,
    message: 'Webhook updated successfully',
    data: { webhookUrl, webhookActive }
  });
}

export async function POST(req: NextRequest) {
  return handleSaveWebhook(req);
}

export async function PUT(req: NextRequest) {
  return handleSaveWebhook(req);
}
