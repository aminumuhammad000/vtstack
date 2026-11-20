import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import palmpayService from '@/lib/palmpay/service';
import { dispatchWebhook } from '@/lib/webhookDispatcher';

/**
 * GET /api/webhooks/palmpay
 * Diagnostic & Health Check Endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'PalmPay Webhook endpoint is active and listening for transfer notifications',
    endpoint: '/api/webhooks/palmpay',
    status: 'OPERATIONAL',
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/webhooks/palmpay
 * PalmPay Dedicated Virtual Account Deposit Webhook Handler
 */
export async function POST(req: NextRequest) {
  let rawBody = '';
  let body: any = {};

  try {
    rawBody = await req.text();
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = {};
    }

    console.log('[PalmPay Webhook] Incoming notification received:');
    console.log('[PalmPay Webhook] Headers:', {
      signature: req.headers.get('signature'),
      'x-palm-signature': req.headers.get('x-palm-signature'),
      sign: req.headers.get('sign'),
    });
    console.log('[PalmPay Webhook] Body:', JSON.stringify(body, null, 2));

    // 1. Signature Verification
    const rawSignature =
      req.headers.get('signature') ||
      req.headers.get('x-palm-signature') ||
      req.headers.get('sign') ||
      body.sign ||
      '';

    const isValidSignature = palmpayService.verifyWebhookSignature(rawBody, rawSignature, body);

    if (!isValidSignature && process.env.PALMPAY_SKIP_SIG_VERIFY !== 'true') {
      console.warn('[PalmPay Webhook] ❌ Invalid signature received');
      await db.webhooks.create({
        source: 'palmpay',
        eventType: body.type || body.notifyType || 'pay_in_order',
        payload: body,
        signature: rawSignature,
        signatureValid: false,
        dispatchStatus: 'failed',
        processingResult: 'Rejected: invalid signature',
        createdAt: new Date().toISOString(),
      });

      return new NextResponse('Invalid signature', { status: 400 });
    }

    // 2. Parse Deposit Event Details
    const deposit = palmpayService.parseDepositWebhook(body);
    if (!deposit) {
      console.warn('[PalmPay Webhook] ⚠️ Unable to parse deposit fields from body');
      return new NextResponse('Invalid payload', { status: 400 });
    }

    const {
      orderNo,
      orderStatus,
      amount,
      virtualAccountNo,
      accountReference,
      payerName,
      payerAccountNo,
      payerBankName,
      sessionId,
    } = deposit;

    console.log(`[PalmPay Webhook] Order: ${orderNo}, Amount: ₦${amount}, VA: ${virtualAccountNo}, Status: ${orderStatus}`);

    // Verify deposit status is success: PalmPay uses 2 (or 'SUCCESS', '00', 1)
    const isSuccess =
      orderStatus === 2 ||
      orderStatus === '2' ||
      orderStatus === 'SUCCESS' ||
      orderStatus === 1 ||
      orderStatus === '1' ||
      orderStatus === '00';

    if (!isSuccess) {
      console.log(`[PalmPay Webhook] Deposit status is ${orderStatus} (non-success). Acknowledged.`);
      await db.webhooks.create({
        source: 'palmpay',
        eventType: 'pay_in_order',
        payload: body,
        signature: rawSignature,
        signatureValid: true,
        dispatchStatus: 'success',
        processingResult: `Ignored non-success status: ${orderStatus}`,
        createdAt: new Date().toISOString(),
      });
      return new NextResponse('success', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // 3. Find Virtual Account in Database
    let virtualAccount = null;
    if (virtualAccountNo) {
      virtualAccount = await db.virtualAccounts.findByAccountNumber(virtualAccountNo);
    }
    if (!virtualAccount && accountReference) {
      // Look up by reference
      const allAccounts = await db.virtualAccounts.findAll();
      virtualAccount = allAccounts.find(va => va.reference === accountReference || va.accountNumber === virtualAccountNo) || null;
    }

    if (!virtualAccount) {
      console.error(`[PalmPay Webhook] ❌ Virtual account not found for accountNo: ${virtualAccountNo}, ref: ${accountReference}`);
      await db.webhooks.create({
        source: 'palmpay',
        eventType: 'pay_in_order',
        payload: body,
        signature: rawSignature,
        signatureValid: true,
        dispatchStatus: 'failed',
        processingResult: `Virtual Account not found: ${virtualAccountNo}`,
        createdAt: new Date().toISOString(),
      });
      // PalmPay requires HTTP 200 'success' to prevent continuous retries for non-existent accounts
      return new NextResponse('success', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    const userId = virtualAccount.userId;

    // 4. Duplicate Transaction Protection (Idempotency)
    const userTransactions = await db.transactions.findByUserId(userId);
    const existingTxn = userTransactions.find(t => t.reference === orderNo || t.externalRef === orderNo);

    if (existingTxn) {
      console.log(`[PalmPay Webhook] ✅ Transaction ${orderNo} already processed. Skipping duplicate.`);
      return new NextResponse('success', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // 5. Calculate Fees & Net Deposit Amount
    const settings = await db.systemSettings.get();
    const feePercent = settings?.deposit?.virtualAccountChargePercent ?? 0.5;
    const fee = Number(((amount * feePercent) / 100).toFixed(2));
    const netAmount = Number((amount - fee).toFixed(2));

    // 6. Credit User Wallet
    let wallet = await db.wallets.findByUserId(userId);
    if (!wallet) {
      wallet = await db.wallets.create({
        userId,
        balance: 0,
        clearedBalance: 0,
        lockedBalance: 0,
        currency: 'NGN',
      });
    }

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = Number((balanceBefore + netAmount).toFixed(2));
    const clearedBefore = Number(wallet.clearedBalance) || 0;
    const clearedAfter = Number((clearedBefore + netAmount).toFixed(2));

    await db.wallets.update(wallet.id, {
      balance: balanceAfter,
      clearedBalance: clearedAfter,
    });

    console.log(`[PalmPay Webhook] Wallet credited for user ${userId}: before=₦${balanceBefore}, after=₦${balanceAfter}`);

    // 7. Record Transaction
    const newTx = await db.transactions.create({
      walletId: wallet.id,
      userId,
      type: 'credit',
      category: 'deposit',
      amount: netAmount,
      fee: fee,
      balanceBefore,
      balanceAfter,
      reference: orderNo,
      externalRef: orderNo,
      customerReference: sessionId || accountReference,
      narration: `PalmPay deposit from ${payerName || 'Customer'} (${payerBankName || 'PalmPay'})`,
      status: 'success',
      isCleared: true,
      clearedAt: new Date().toISOString(),
      metadata: {
        source: 'palmpay',
        orderNo,
        virtualAccountNo,
        payerName,
        payerAccountNo,
        payerBankName,
        sessionId,
        grossAmount: amount,
        fee,
        netAmount,
      },
    });

    // 8. Send Notification to User
    await db.notifications.create({
      userId,
      title: 'Deposit Received',
      message: `₦${netAmount.toLocaleString()} credited to your wallet via PalmPay account ${virtualAccount.accountNumber}. (Gross: ₦${amount.toLocaleString()}, Fee: ₦${fee.toLocaleString()})`,
      type: 'payment',
      isRead: false,
    });

    // 9. Dispatch Webhook to Merchant / User if configured
    try {
      const tenant = await db.users.findById(userId);
      if (tenant?.webhookUrl && tenant?.webhookActive !== false) {
        await dispatchWebhook({
          userId,
          event: 'virtual_account.credit',
          payload: {
            event: 'virtual_account.credit',
            data: {
              reference: orderNo,
              amount: netAmount,
              grossAmount: amount,
              fee,
              accountNumber: virtualAccount.accountNumber,
              payerName,
              payerAccountNo,
              payerBankName,
              sessionId,
              timestamp: new Date().toISOString(),
            },
          },
          req,
          source: 'vtstack',
        });
      }
    } catch (whErr) {
      console.error('[PalmPay Webhook] User webhook dispatch failed:', whErr);
    }

    // 10. Log Webhook in Database
    await db.webhooks.create({
      source: 'palmpay',
      eventType: body.type || body.notifyType || 'pay_in_order',
      userId: {
        _id: userId,
        email: virtualAccount.email,
        businessName: virtualAccount.accountName,
      },
      payload: body,
      signature: rawSignature,
      signatureValid: true,
      dispatchStatus: 'success',
      processingResult: `Successfully credited ₦${netAmount} to user ${userId} (Tx: ${newTx.id})`,
      createdAt: new Date().toISOString(),
    });

    console.log(`[PalmPay Webhook] ✅ Successfully processed deposit ${orderNo}`);

    // PalmPay explicitly requires HTTP 200 with body string "success"
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error: any) {
    console.error('[PalmPay Webhook] ❌ Unhandled error:', error);
    // Return 200 to PalmPay so PalmPay does not repeatedly spam retries on unrecoverable server errors
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
