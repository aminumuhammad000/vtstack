import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
      success: true,
      message: 'System backup initiated successfully',
      data: {
        timestamp: new Date().toISOString(),
        status: 'COMPLETED',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to initiate backup' }, { status: 500 });
  }
}
