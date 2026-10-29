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

    const trimmedOtp = String(otp).trim();
    const storedVerification = user.verificationToken ? String(user.verificationToken).trim() : '';
    const storedReset = user.resetPasswordOtp ? String(user.resetPasswordOtp).trim() : '';

    if (trimmedOtp !== storedVerification && trimmedOtp !== storedReset) {
      return NextResponse.json({ success: false, message: 'Invalid or expired OTP code' }, { status: 400 });
    }

    await db.users.update(user.id, {
      kycLevel: 1,
      isEmailVerified: true,
      verificationToken: null,
      resetPasswordOtp: null,
    });
    return NextResponse.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Verification failed' }, { status: 500 });
  }
}
