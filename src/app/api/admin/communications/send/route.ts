import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const created = await db.communications.create({
      type: 'bulk',
      subject: data.subject,
      message: data.message,
      targetAudience: data.targetAudience || 'all',
      sentBy: admin.email,
    });

    return NextResponse.json({ success: true, message: 'Bulk communication queued successfully', data: created });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to send bulk communication' }, { status: 500 });
  }
}
