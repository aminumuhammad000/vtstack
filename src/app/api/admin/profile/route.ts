import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
      success: true,
      data: {
        _id: admin.id,
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        first_name: admin.firstName,
        last_name: admin.lastName,
        phone: admin.phone,
        role: admin.role,
        status: admin.status,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch admin profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const updates: any = {};
    if (body.firstName) updates.firstName = body.firstName;
    if (body.lastName) updates.lastName = body.lastName;
    if (body.phone) updates.phone = body.phone;

    const updated = await db.users.update(admin.id, updates);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: updated?.id,
        id: updated?.id,
        email: updated?.email,
        firstName: updated?.firstName,
        lastName: updated?.lastName,
        phone: updated?.phone,
        role: updated?.role,
        status: updated?.status,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update profile' }, { status: 500 });
  }
}
