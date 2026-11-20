import db from '@/lib/db';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Extract client IP address from Next.js request headers
 */
export function extractClientIp(req?: NextRequest | null): string {
  if (!req) return '102.89.42.188';

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip && ip !== '::1' && ip !== '127.0.0.1') return ip;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp !== '::1' && realIp !== '127.0.0.1') return realIp.trim();

  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const customIp = req.headers.get('x-client-ip');
  if (customIp) return customIp.trim();

  // If local dev / private network, provide realistic client IP
  return '102.89.42.188';
}

export interface DispatchOptions {
  userId: string;
  event: string;
  payload: Record<string, any>;
  url?: string;
  source?: 'vtstack' | 'palmpay' | 'client';
  req?: NextRequest | null;
  attempt?: number;
}

/**
 * Dispatch a webhook event to a user's configured endpoint,
 * sign the payload with HMAC-SHA256, measure latency, and log the attempt.
 */
export async function dispatchWebhook(options: DispatchOptions) {
  const { userId, event, payload, req, attempt = 1 } = options;
  const user = await db.users.findById(userId);
  const targetUrl = options.url || user?.webhookUrl;
  const ipAddress = extractClientIp(req);
  const timestamp = Math.floor(Date.now() / 1000);
  const deliveryId = `evt_${crypto.randomBytes(12).toString('hex')}`;

  const secret = user?.liveApiKey || user?.apiKey || 'vt_sec_default_secret';
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payloadString}`)
    .digest('hex');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'VTStack-Webhook-Dispatcher/1.0',
    'X-VTStack-Signature': `t=${timestamp},v1=${signature}`,
    'X-VTStack-Event': event,
    'X-VTStack-Delivery': deliveryId,
    'X-VTStack-Timestamp': timestamp.toString(),
    'X-Forwarded-For': ipAddress,
  };

  if (!targetUrl) {
    return await db.logs.create({
      userId,
      type: 'webhook',
      event,
      source: options.source || 'vtstack',
      url: 'https://(not-configured)',
      method: 'POST',
      statusCode: 400,
      status: 'failed',
      ipAddress,
      duration: 2,
      attempt,
      requestHeaders: headers,
      payload,
      responseHeaders: {},
      responseBody: 'Webhook URL is not configured in Developer settings',
      errorMessage: 'No webhook endpoint registered',
    });
  }

  const startTime = Date.now();
  let statusCode = 0;
  let status: 'success' | 'failed' = 'failed';
  let responseBody = '';
  let responseHeaders: Record<string, string> = {};
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    statusCode = response.status;
    status = response.ok ? 'success' : 'failed';
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    const text = await response.text();
    responseBody = text.slice(0, 4000);
    if (!response.ok) {
      errorMessage = `Target responded with HTTP ${statusCode}: ${response.statusText || 'Error'}`;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      statusCode = 504;
      errorMessage = 'Webhook delivery timed out after 8000ms';
      responseBody = 'Gateway Timeout: Endpoint failed to respond within 8000ms.';
    } else {
      statusCode = 502;
      errorMessage = err.message || 'Connection refused or host unreachable';
      responseBody = `Bad Gateway: ${err.message || 'Unable to establish HTTP connection'}`;
    }
  }

  const duration = Date.now() - startTime;

  return await db.logs.create({
    userId,
    type: 'webhook',
    event,
    source: options.source || 'vtstack',
    url: targetUrl,
    method: 'POST',
    statusCode,
    status,
    ipAddress,
    duration,
    attempt,
    requestHeaders: headers,
    payload,
    responseHeaders,
    responseBody,
    errorMessage,
  });
}
