import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { dispatchWebhook } from '@/lib/webhookDispatcher';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const event = body.event || 'webhook.test';
    const targetUrl = body.url || user.webhookUrl;

    const payload = body.payload || {
      event,
      data: {
        id: `evt_test_${Date.now()}`,
        reference: `TST-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'SUCCESS',
        amount: 25000,
        currency: 'NGN',
        accountNumber: '9901847120',
        message: 'This is a live test notification from VTStack Webhook Dispatcher.',
        timestamp: new Date().toISOString(),
      },
    };

    const log = await dispatchWebhook({
      userId: user.id,
      event,
      payload,
      url: targetUrl,
      source: 'vtstack',
      req,
    });

    return NextResponse.json({
      success: true,
      message: log.status === 'success' 
        ? 'Test webhook dispatched successfully' 
        : `Test webhook dispatched with status: ${log.statusCode || 'failed'} (${log.errorMessage || 'Unknown error'})`,
      log,
    });
  } catch (error: any) {
    console.error('[API Developer Webhook Test POST Error]:', error);
    return NextResponse.json({ success: false, message: 'Failed to dispatch test webhook' }, { status: 500 });
  }
}
