import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth/jwt';
import { sendOtpEmail, sendWelcomeEmail } from '@/lib/email/resend';

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, fullName, phone, businessName } = await req.json();

    let fName = firstName;
    let lName = lastName;
    if (fullName && (!firstName || !lastName)) {
      const parts = fullName.trim().split(' ');
      fName = parts[0];
      lName = parts.slice(1).join(' ') || '';
    }

    if (!email || !password || !fName || !phone) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = typeof password === 'string' ? password.trim() : password;

    const existing = await db.users.findByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json({ success: false, message: 'User with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(cleanPassword);
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await db.users.create({
      email: cleanEmail,
      passwordHash,
      firstName: fName,
      lastName: lName,
      fullName: fullName || `${fName} ${lName}`.trim(),
      phone: phone.trim(),
      businessName: businessName?.trim(),
      kycLevel: 1, // Activated
      status: 'active',
      verificationToken,
      resetPasswordOtp: verificationToken,
      resetPasswordOtpExpires: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      isEmailVerified: true,
    });

    // Send verification OTP email via Resend
    try {
      await sendOtpEmail(user.email, verificationToken);
    } catch (emailErr) {
      console.error('[Registration] Failed to send OTP email:', emailErr);
    }

    // Create wallet
    const wallet = await db.wallets.create({
      userId: user.id,
      balance: 0,
      clearedBalance: 0,
      lockedBalance: 0,
      currency: 'NGN',
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          _id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          phone: user.phone,
          kycLevel: user.kycLevel,
          kyc_status: user.kyc_status,
          status: user.status,
          role: user.role,
        },
        token,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, message: 'Registration failed' }, { status: 500 });
  }
}
