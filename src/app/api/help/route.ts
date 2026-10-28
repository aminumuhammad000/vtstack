import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const messages = await db.help.findAll();
  return NextResponse.json({ success: true, data: messages.filter((m: any) => m.userId === user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const msg = await db.help.create({ userId: user.id, email: user.email, ...body });
  return NextResponse.json({ success: true, message: 'Support ticket submitted', data: msg });
}
