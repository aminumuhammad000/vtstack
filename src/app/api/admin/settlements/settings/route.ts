import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const settings = await db.systemSettings.get();
    const updated = await db.systemSettings.update({
      globalSettlement: {
        ...(settings?.globalSettlement || {}),
        ...data,
      },
    });

    return NextResponse.json({ success: true, message: 'Settlement settings updated', data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update settlement settings' }, { status: 500 });
  }
}
