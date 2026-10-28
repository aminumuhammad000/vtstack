import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const settings = await db.systemSettings.get();
    return NextResponse.json({ success: true, data: settings?.globalSettlement || {} });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch global settlement config' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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

    return NextResponse.json({ success: true, message: 'Global config updated', data: updated.globalSettlement });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update global config' }, { status: 500 });
  }
}
