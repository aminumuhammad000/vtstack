import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ success: false, message: 'Email and OTP required' }, { status: 400 });
    }

    const user = await db.users.findByEmail(email);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    await db.users.update(user.id, { kycLevel: 1, isEmailVerified: true });
    return NextResponse.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Verification failed' }, { status: 500 });
  }
}
