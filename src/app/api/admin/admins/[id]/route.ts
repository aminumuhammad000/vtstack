import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { hashPassword } from '@/lib/auth/jwt';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const target = await db.users.findById(id);
    if (!target || (target.role !== 'admin' && target.role !== 'subadmin')) {
      return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: target.id,
        id: target.id,
        email: target.email,
        firstName: target.firstName,
        lastName: target.lastName,
        phone: target.phone,
        status: target.status,
        role: target.role,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch admin' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const updates: any = {};
    if (body.firstName) updates.firstName = body.firstName;
    if (body.lastName) updates.lastName = body.lastName;
    if (body.phone) updates.phone = body.phone;
    if (body.role) updates.role = body.role;
    if (body.status) updates.status = body.status;
    if (body.password) updates.passwordHash = await hashPassword(body.password);

    const updated = await db.users.update(id, updates);
    if (!updated) return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      message: 'Admin updated successfully',
      data: {
        _id: updated.id,
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        status: updated.status,
        role: updated.role,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update admin' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await db.users.delete(id);
    return NextResponse.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to delete admin' }, { status: 500 });
  }
}
