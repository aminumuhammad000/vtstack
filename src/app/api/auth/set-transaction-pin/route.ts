import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { hashPassword } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { pin } = await req.json();
    if (!pin || pin.length !== 4) return NextResponse.json({ success: false, message: 'Pin must be 4 digits' }, { status: 400 });

    const transactionPinHash = await hashPassword(pin);
    await db.users.update(user.id, { transactionPinHash, transactionPinSet: true });
    return NextResponse.json({ success: true, message: 'PIN set successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to set PIN' }, { status: 500 });
  }
}
