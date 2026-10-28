import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }
    const user = await db.users.findByEmail(email);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    const passwordHash = await hashPassword(password);
    await db.users.update(user.id, { passwordHash });
    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to reset password' }, { status: 500 });
  }
}
