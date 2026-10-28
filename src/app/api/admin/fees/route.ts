import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const fees = await db.fees.findAll();
    return NextResponse.json({ success: true, data: fees });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch fees' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const created = await db.fees.create(data);
    return NextResponse.json({ success: true, message: 'Fee rule created', data: created });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to create fee' }, { status: 500 });
  }
}
