import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { calculatePayoutFee } from '@/lib/fees';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { accountNumber } = body;
    const rawAmount = Number(body.amount);

    if (isNaN(rawAmount) || rawAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Amount is required and must be greater than 0' },
        { status: 400 }
      );
    }

    // Determine amount in Naira:
    // If explicit amountInNaira is provided, use it.
    // Otherwise, if rawAmount is in kobo (from Payout.tsx or legacy API), convert to Naira.
    let amountInNaira =
      body.amountInNaira !== undefined
        ? Number(body.amountInNaira)
        : body.isKobo
        ? rawAmount / 100
        : rawAmount >= 10000 && Number.isInteger(rawAmount)
        ? rawAmount / 100
        : rawAmount;

    // Check if internal virtual account
    let isInternal = false;
    if (accountNumber) {
      const va = await db.virtualAccounts.findByAccountNumber(accountNumber);
      if (va) isInternal = true;
    }

    const fees = await calculatePayoutFee(amountInNaira, isInternal);

    return NextResponse.json({
      success: true,
      data: {
        ...fees,
        isInternal,
      },
    });
  } catch (error) {
    console.error('Calculate fees error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to calculate fees' },
      { status: 500 }
    );
  }
}
