import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { userId, subject, message } = await req.json();
    const created = await db.communications.create({
      type: 'single',
      userId,
      subject,
      message,
      sentBy: admin.email,
    });

    return NextResponse.json({ success: true, message: 'Message sent successfully', data: created });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to send message' }, { status: 500 });
  }
}
