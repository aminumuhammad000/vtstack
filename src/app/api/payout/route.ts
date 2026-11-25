import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { dispatchWebhook } from '@/lib/webhookDispatcher';
import { calculatePayoutFee } from '@/lib/fees';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const payouts = await db.payouts.findByUserId(user.id);
    return NextResponse.json({ success: true, data: payouts });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch payouts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const rawAmount = Number(body.amount);

    if (isNaN(rawAmount) || rawAmount <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid payout amount' }, { status: 400 });
    }

    const wallet = await db.wallets.findByUserId(user.id);
    if (!wallet) {
      return NextResponse.json({ success: false, message: 'Wallet not found' }, { status: 404 });
    }

    // Determine amount in Naira
    let amountInNaira =
      body.amountInNaira !== undefined
        ? Number(body.amountInNaira)
        : body.isKobo
        ? rawAmount / 100
        : rawAmount >= 10000 && Number.isInteger(rawAmount)
        ? rawAmount / 100
        : rawAmount;

    // Optional PIN verification if PIN was provided or set
    if (body.pin && user.transactionPinHash) {
      const isPinValid = await bcrypt.compare(body.pin, user.transactionPinHash);
      if (!isPinValid) {
        return NextResponse.json({ success: false, message: 'Invalid transaction PIN' }, { status: 400 });
      }
    }

    // Check if recipient is internal VA
    let isInternal = false;
    if (body.accountNumber) {
      const va = await db.virtualAccounts.findByAccountNumber(body.accountNumber);
      if (va) isInternal = true;
    }

    // Calculate fee dynamically using admin configured settings with fallback
    const fees = await calculatePayoutFee(amountInNaira, isInternal);

    if (amountInNaira < fees.minAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum payout amount is ₦${fees.minAmount.toLocaleString()}`,
        },
        { status: 400 }
      );
    }

    const availableBal = Number(wallet.clearedBalance) > 0 ? Number(wallet.clearedBalance) : Number(wallet.balance);
    if (availableBal < fees.totalDebit) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient wallet balance. Total required: ₦${fees.totalDebit.toLocaleString()}`,
        },
        { status: 400 }
      );
    }

    const payout = await db.payouts.create({
      userId: user.id,
      amount: amountInNaira,
      fee: fees.fee + fees.gatewayFee,
      payrantFee: fees.gatewayFee,
      totalDebit: fees.totalDebit,
      bankCode: body.bankCode,
      accountNumber: body.accountNumber,
      accountName: body.accountName || 'Beneficiary',
      payoutType: isInternal ? 'internal' : 'external',
      reference: `PO-${Date.now()}`,
      status: 'SUCCESS',
    });

    // Debit wallet
    const newBalance = Number((wallet.balance - fees.totalDebit).toFixed(2));
    const newCleared = Number((wallet.clearedBalance - fees.totalDebit).toFixed(2));
    await db.wallets.update(wallet.id, {
      balance: newBalance,
      clearedBalance: newCleared,
    });

    // Create transaction record
    await db.transactions.create({
      walletId: wallet.id,
      userId: user.id,
      type: 'debit',
      category: 'withdrawal',
      amount: amountInNaira,
      fee: fees.fee + fees.gatewayFee,
      balanceBefore: wallet.balance,
      balanceAfter: newBalance,
      reference: payout.reference,
      narration: body.narration || `Payout to ${body.accountName || 'Beneficiary'} (${body.accountNumber})`,
      status: 'success',
      isCleared: true,
      clearedAt: new Date().toISOString(),
    });

    // Save bank details if requested
    if (body.saveAccount || body.saveBeneficiary) {
      await db.users.update(user.id, {
        savedBankDetails: {
          bankCode: body.bankCode,
          accountNumber: body.accountNumber,
          accountName: body.accountName || 'Beneficiary',
          bankName: body.bankName || 'Bank',
        },
      });
    }

    // Dispatch webhook to merchant (alerts via email, notification and logs if unconfigured)
    try {
      await dispatchWebhook({
        userId: user.id,
        event: 'payout.success',
        payload: {
          event: 'payout.success',
          data: {
            reference: payout.reference,
            amount: amountInNaira,
            fee: fees.fee + fees.gatewayFee,
            totalDebit: fees.totalDebit,
            accountNumber: body.accountNumber,
            accountName: body.accountName || 'Beneficiary',
            bankCode: body.bankCode,
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
          },
        },
        req,
        source: 'vtstack',
      });
    } catch (whErr) {
      console.error('[Payout] Webhook dispatch error:', whErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Payout processed successfully',
      data: {
        ...payout,
        amountInNaira,
        amountInKobo: Math.round(amountInNaira * 100),
        amount: Math.round(amountInNaira * 100), // legacy kobo compatibility
        totalDebitInNaira: fees.totalDebit,
        feeInNaira: fees.fee + fees.gatewayFee,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Payout failed' }, { status: 500 });
  }
}
