import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const notifications = [
      {
        _id: 'notif-1',
        title: 'New Merchant Onboarded',
        message: 'Apex Store Ltd registered and submitted KYC Tier 2 documents.',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'notif-2',
        title: 'System Health Optimal',
        message: 'All webhook processors and virtual account routers operating normally.',
        read: true,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ];

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch notifications' }, { status: 500 });
  }
}
