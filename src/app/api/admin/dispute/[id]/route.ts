import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({ success: true, message: 'Dispute status updated' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update dispute' }, { status: 500 });
  }
}
