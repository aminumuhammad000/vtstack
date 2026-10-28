import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountNumber: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { accountNumber } = await params;
    const account = await db.virtualAccounts.findByAccountNumber(accountNumber);

    if (!account) {
      return NextResponse.json({ success: false, message: 'Virtual account not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: account,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch virtual account' }, { status: 500 });
  }
}
