import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const accounts = await db.virtualAccounts.findAll();
    const formatted = accounts.map(a => ({
      _id: a.id,
      id: a.id,
      userId: a.userId,
      accountNumber: a.accountNumber,
      accountName: a.accountName,
      bankName: a.bankName,
      bankType: a.bankType,
      email: a.email,
      alias: a.alias,
      reference: a.reference,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch virtual accounts' }, { status: 500 });
  }
}
