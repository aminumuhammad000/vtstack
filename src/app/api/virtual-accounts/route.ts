import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const accounts = await db.virtualAccounts.findByUserId(user.id);
    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch virtual accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString();
    const accountNumber = `99${randomSuffix}`;

    const newAccount = await db.virtualAccounts.create({
      userId: user.id,
      accountNumber,
      accountName: `VTStack - ${user.fullName || user.businessName || user.firstName}`,
      bankName: body.bankName || 'PalmPay',
      bankType: 'palmpay',
      email: user.email,
      alias: body.alias || 'Collection Account',
      reference: `VA-${Date.now()}`,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      message: 'Virtual account created successfully',
      data: newAccount,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to create virtual account' }, { status: 500 });
  }
}
