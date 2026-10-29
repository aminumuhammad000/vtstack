import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendOtpEmail } from '@/lib/email/resend';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    const user = await db.users.findByEmail(email);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.users.update(user.id, {
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: expires,
    });

    // Send email using Resend
    await sendOtpEmail(user.email, otp);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully to your email',
    });
  } catch (error: any) {
    console.error('Failed to send OTP:', error);
    return NextResponse.json({ success: false, message: 'Failed to resend OTP' }, { status: 500 });
  }
}
