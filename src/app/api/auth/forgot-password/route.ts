import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email/resend';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    const user = await db.users.findByEmail(email);
    if (!user) {
      // Don't leak user existence for security
      return NextResponse.json({ success: true, message: 'If an account exists, a reset code was sent' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await db.users.update(user.id, {
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: expires,
    });

    await sendPasswordResetEmail(user.email, otp);

    return NextResponse.json({
      success: true,
      message: 'Password reset OTP sent to your email',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, message: 'Failed to process request' }, { status: 500 });
  }
}
