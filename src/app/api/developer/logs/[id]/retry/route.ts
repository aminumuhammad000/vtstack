import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { dispatchWebhook } from '@/lib/webhookDispatcher';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existingLog = await db.logs.findById(id);

    if (!existingLog) {
      return NextResponse.json({ success: false, message: 'Log entry not found' }, { status: 404 });
    }

    const ownerId = typeof existingLog.userId === 'object' ? existingLog.userId?._id : existingLog.userId;
    if (ownerId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Redeliver the webhook payload
    const newAttemptNumber = (existingLog.attempt || 1) + 1;
    const newLog = await dispatchWebhook({
      userId: user.id,
      event: existingLog.event,
      payload: existingLog.payload,
      url: existingLog.url || user.webhookUrl,
      source: existingLog.source || 'vtstack',
      req,
      attempt: newAttemptNumber,
    });

    return NextResponse.json({
      success: true,
      message: newLog.status === 'success'
        ? `Webhook retried successfully (Attempt #${newAttemptNumber})`
        : `Retry completed with status ${newLog.statusCode || 'failed'} (${newLog.errorMessage || 'Error'})`,
      log: newLog,
    });
  } catch (error: any) {
    console.error('[API Developer Logs Retry Error]:', error);
    return NextResponse.json({ success: false, message: 'Failed to retry webhook' }, { status: 500 });
  }
}
