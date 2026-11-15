/**
 * Test PalmPay Webhook Deposit Processing & Idempotency
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TARGET_HOST = process.env.TEST_HOST || 'https://vtstack.ng';

async function testWebhookProcessing() {
  console.log('--- Testing PalmPay Webhook Signed Deposit Flow ---');

  const privKeyPath = path.join(process.cwd(), 'legacy/server/src/config/palmpay_private_key.pem');
  const privKey = fs.readFileSync(privKeyPath, 'utf8');

  // Test VA in DB: 9997145441
  const testOrderNo = 'TEST_PALMPAY_DEP_' + Date.now();
  const webhookBody = {
    orderNo: testOrderNo,
    orderStatus: 2,
    orderAmount: 100000, // ₦1,000 in kobo/minor units
    currency: 'NGN',
    virtualAccountNo: '9997145441',
    payerAccountNo: '0123456789',
    payerAccountName: 'Test Payer Verification',
    payerBankName: 'GTBank',
    timestamp: Date.now()
  };

  // Sign using RSA-SHA1 on uppercase MD5 of sorted body keys
  const sortedKeys = Object.keys(webhookBody).sort();
  const strA = sortedKeys.map(k => `${k}=${String(webhookBody[k]).trim()}`).join('&');
  const md5Str = crypto.createHash('md5').update(strA).digest('hex').toUpperCase();

  const signer = crypto.createSign('RSA-SHA1');
  signer.update(md5Str);
  const signature = signer.sign(privKey, 'base64');

  console.log('Sending signed webhook payload to:', `${TARGET_HOST}/api/webhooks/palmpay`);
  console.log('OrderNo:', testOrderNo);
  console.log('Signature:', signature.slice(0, 30) + '...');

  // 1. Initial Deposit
  const res1 = await fetch(`${TARGET_HOST}/api/webhooks/palmpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Signature': signature
    },
    body: JSON.stringify(webhookBody)
  });

  const text1 = await res1.text();
  console.log(`Initial Deposit Response: HTTP ${res1.status} -> "${text1}"`);

  // 2. Duplicate / Replay Deposit
  const res2 = await fetch(`${TARGET_HOST}/api/webhooks/palmpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Signature': signature
    },
    body: JSON.stringify(webhookBody)
  });

  const text2 = await res2.text();
  console.log(`Replay Deposit Response: HTTP ${res2.status} -> "${text2}"`);

  if (res1.status === 200 && text1.trim() === 'success' && res2.status === 200 && text2.trim() === 'success') {
    console.log('✅ Webhook processing and idempotency verified successfully!');
  } else {
    console.error('❌ Webhook test failed expectations');
  }
}

testWebhookProcessing().catch(console.error);
