import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const recent = await db.communications.findAll();
    const formatted = (recent || []).map((r: any) => ({
      ...r,
      _id: r.id || r._id,
      id: r.id || r._id,
      recipientType: r.recipientType || r.targetAudience || (r.type === 'bulk' ? 'all' : 'specific'),
      recipientCount: r.recipientCount || (r.type === 'bulk' ? r.recipientCount || 1 : 1),
      subject: r.subject || 'Announcement',
      message: r.message || '',
      sentAt: r.sentAt || r.createdAt || r.created_at || new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch communications' }, { status: 500 });
  }
}
