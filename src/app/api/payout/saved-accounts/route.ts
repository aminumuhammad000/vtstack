import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: true, data: user.payoutAccounts || [] });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const accounts = user.payoutAccounts || [];
  accounts.push({ id: Date.now().toString(), ...body });
  await db.users.update(user.id, { payoutAccounts: accounts });
  return NextResponse.json({ success: true, message: 'Account saved', data: accounts });
}
