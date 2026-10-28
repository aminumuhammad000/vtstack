import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const accounts = await db.virtualAccounts.findAll();
    const account = accounts.find(a => a.id === id || a.accountNumber === id);
    if (!account) return NextResponse.json({ success: false, message: 'Virtual account not found' }, { status: 404 });

    const user = await db.users.findById(account.userId);
    const transactions = await db.transactions.findByUserId(account.userId);

    return NextResponse.json({
      success: true,
      data: {
        ...account,
        _id: account.id,
        user: user ? {
          _id: user.id,
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          businessName: user.businessName,
        } : null,
        transactions: transactions.slice(0, 20).map(t => ({ ...t, _id: t.id })),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch virtual account' }, { status: 500 });
  }
}
