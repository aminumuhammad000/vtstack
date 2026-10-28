import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { hashPassword, comparePassword } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) return NextResponse.json({ success: false, message: 'Current password incorrect' }, { status: 400 });

    const passwordHash = await hashPassword(newPassword);
    await db.users.update(user.id, { passwordHash });
    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to change password' }, { status: 500 });
  }
}
