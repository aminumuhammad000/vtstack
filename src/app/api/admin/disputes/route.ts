import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch disputes' }, { status: 500 });
  }
}
