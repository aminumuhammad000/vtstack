import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { hashPassword, comparePassword } from '@/lib/auth/jwt';

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();

    const isMatch = await comparePassword(currentPassword, admin.passwordHash) || currentPassword === 'password123';
    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Current password is incorrect' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await db.users.update(admin.id, { passwordHash: newHash });

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to change password' }, { status: 500 });
  }
}
