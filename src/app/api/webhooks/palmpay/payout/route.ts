import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import palmpayService from '@/lib/palmpay/service';
import { dispatchWebhook } from '@/lib/webhookDispatcher';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'PalmPay Payout Webhook endpoint is active',
    endpoint: '/api/webhooks/palmpay/payout',
    status: 'OPERATIONAL',
    timestamp: new Date().toISOString(),
  });
}

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

    console.log('[PalmPay Payout Webhook] Received:', JSON.stringify(body, null, 2));

    const rawSignature =
      req.headers.get('signature') ||
      req.headers.get('x-palm-signature') ||
      req.headers.get('sign') ||
      body.sign ||
      '';

    const isValidSignature = palmpayService.verifyWebhookSignature(rawBody, rawSignature, body);

    const orderNo = body.orderNo || body.orderId;
    const orderStatus = Number(body.orderStatus);

    if (!isValidSignature && process.env.PALMPAY_SKIP_SIG_VERIFY !== 'true') {
      console.warn('[PalmPay Payout Webhook] Invalid signature');
      await db.webhooks.create({
        source: 'palmpay',
        eventType: 'payout_notify',
        payload: body,
        signature: rawSignature,
        signatureValid: false,
        dispatchStatus: 'failed',
        processingResult: 'Invalid signature',
        createdAt: new Date().toISOString(),
      });
      return new NextResponse('Invalid signature', { status: 400 });
    }

    if (orderNo) {
      // Find payout record if present
      const allPayouts = await db.payouts.findAll();
      const payout = allPayouts.find(p => p.reference === orderNo || p.externalRef === orderNo);

      if (payout) {
        // Status 1 or 2 is success in PalmPay payout
        if (orderStatus === 1 || orderStatus === 2) {
          // Success
          await db.notifications.create({
            userId: payout.userId,
            title: 'Payout Completed',
            message: `Your transfer of ₦${payout.amount.toLocaleString()} to ${payout.accountName} (${payout.accountNumber}) was successful.`,
            type: 'success',
            isRead: false,
          });

          // Dispatch webhook to merchant
          try {
            await dispatchWebhook({
              userId: payout.userId,
              event: 'payout.success',
              payload: {
                event: 'payout.success',
                data: {
                  reference: payout.reference,
                  amount: payout.amount,
                  fee: payout.fee,
                  totalDebit: payout.totalDebit,
                  accountNumber: payout.accountNumber,
                  accountName: payout.accountName,
                  bankCode: payout.bankCode,
                  status: 'SUCCESS',
                  timestamp: new Date().toISOString(),
                },
              },
              req,
              source: 'vtstack',
            });
          } catch (whErr) {
            console.error('[PalmPay Payout Webhook] Dispatch error:', whErr);
          }
        } else if (orderStatus === 3 || orderStatus === 4) {
          // Failure / Reversal -> unlock/refund user balance
          const wallet = await db.wallets.findByUserId(payout.userId);
          if (wallet) {
            const refundAmount = payout.totalDebit || payout.amount;
            await db.wallets.update(wallet.id, {
              balance: Number((wallet.balance + refundAmount).toFixed(2)),
              clearedBalance: Number((wallet.clearedBalance + refundAmount).toFixed(2)),
            });
            await db.notifications.create({
              userId: payout.userId,
              title: 'Payout Failed & Refunded',
              message: `Your transfer of ₦${payout.amount.toLocaleString()} failed. ₦${refundAmount.toLocaleString()} has been refunded to your wallet.`,
              type: 'warning',
              isRead: false,
            });
          }

          // Dispatch webhook to merchant
          try {
            await dispatchWebhook({
              userId: payout.userId,
              event: 'payout.failed',
              payload: {
                event: 'payout.failed',
                data: {
                  reference: payout.reference,
                  amount: payout.amount,
                  fee: payout.fee,
                  accountNumber: payout.accountNumber,
                  accountName: payout.accountName,
                  bankCode: payout.bankCode,
                  status: 'FAILED',
                  timestamp: new Date().toISOString(),
                },
              },
              req,
              source: 'vtstack',
            });
          } catch (whErr) {
            console.error('[PalmPay Payout Webhook] Dispatch error:', whErr);
          }
        }
      }
    }

    await db.webhooks.create({
      source: 'palmpay',
      eventType: 'payout_notify',
      payload: body,
      signature: rawSignature,
      signatureValid: true,
      dispatchStatus: 'success',
      processingResult: `Processed payout status ${orderStatus} for order ${orderNo}`,
      createdAt: new Date().toISOString(),
    });

    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error: any) {
    console.error('[PalmPay Payout Webhook] Error:', error);
    return new NextResponse('success', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
}
