import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({ success: true, message: 'Risk rule updated' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update risk rule' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({ success: true, message: 'Risk rule deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to delete risk rule' }, { status: 500 });
  }
}
