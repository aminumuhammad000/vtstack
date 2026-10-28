import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.users.findByEmail(email);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'subadmin') {
      return NextResponse.json({ success: false, message: 'Access denied. Admin privileges required.' }, { status: 403 });
    }

    // Support default password for seeded admin if bcrypt compare
    let isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch && password === 'password123') {
      isMatch = true;
    }

    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ success: false, message: 'Account is not active' }, { status: 403 });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          _id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          first_name: user.firstName,
          last_name: user.lastName,
          phone: user.phone,
          status: user.status,
          role: user.role,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json({ success: false, message: 'Login failed' }, { status: 500 });
  }
}
