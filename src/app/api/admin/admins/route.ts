import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { hashPassword } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const admins = await db.users.findAdmins();
    const sanitized = admins.map(a => ({
      _id: a.id,
      id: a.id,
      email: a.email,
      firstName: a.firstName,
      lastName: a.lastName,
      first_name: a.firstName,
      last_name: a.lastName,
      phone: a.phone,
      status: a.status,
      role: a.role,
      apiKey: a.apiKey || a.liveApiKey,
      liveApiKey: a.liveApiKey,
      testApiKey: a.testApiKey,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return NextResponse.json({ success: true, data: sanitized });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to get admins' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentAdmin = await requireAdmin(req);
    if (!currentAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, password, firstName, lastName, phone, role, liveApiKey: customLiveKey, testApiKey: customTestKey } = body;

    const existing = await db.users.findByEmail(email);
    if (existing) {
      return NextResponse.json({ success: false, message: 'Email already exists' }, { status: 400 });
    }

    const randomSuffix = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const liveApiKey = customLiveKey || `vtp_live_admin_${randomSuffix}`;
    const testApiKey = customTestKey || `vtp_test_admin_${randomSuffix}`;

    const passwordHash = await hashPassword(password || 'password123');
    const newAdmin = await db.users.create({
      email,
      passwordHash,
      firstName: firstName || '',
      lastName: lastName || '',
      fullName: `${firstName || ''} ${lastName || ''}`.trim(),
      phone: phone || '',
      role: role || 'admin',
      status: 'active',
      kycLevel: 3,
      kyc_status: 'verified',
      kyc_tier: 't3',
      isPayoutEnabled: true,
      apiKey: liveApiKey,
      liveApiKey,
      testApiKey,
    });

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully with API key configured',
      data: {
        _id: newAdmin.id,
        id: newAdmin.id,
        email: newAdmin.email,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        phone: newAdmin.phone,
        status: newAdmin.status,
        role: newAdmin.role,
        apiKey: newAdmin.apiKey,
        liveApiKey: newAdmin.liveApiKey,
        testApiKey: newAdmin.testApiKey,
        createdAt: newAdmin.createdAt,
        updatedAt: newAdmin.updatedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to create admin' }, { status: 500 });
  }
}
