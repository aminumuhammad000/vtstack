import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    return NextResponse.json({ success: true, message: 'Dispute recorded', data: { id: `disp-${Date.now()}`, ...data } });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to record dispute' }, { status: 500 });
  }
}
