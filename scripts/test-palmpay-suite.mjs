/**
 * Comprehensive PalmPay Integration Test Suite
 * Tests PalmPay Service, Endpoints, Signatures, and Validations.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TARGET_HOST = process.env.TEST_HOST || 'https://vtstack.ng';
const TEST_API_KEY = process.env.TEST_API_KEY || 'vtp_live_admin_98a72b1c8f4d5e6a7b8c';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log(`  VTSTACK PALMPAY INTEGRATION TEST SUITE`);
  console.log(`  Target: ${TARGET_HOST}`);
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // Test 1: Local Key Pair and Cryptographic Verification
  // -------------------------------------------------------------------------
  console.log('[1/6] Cryptography & Key Pair Verification');
  const privKeyPath = path.join(process.cwd(), 'legacy/server/src/config/palmpay_private_key.pem');
  const merchantPubKeyPath = path.join(process.cwd(), 'legacy/server/src/config/palmpay_merchant_public_key.pem');
  const platformPubKeyPath = path.join(process.cwd(), 'legacy/server/src/config/palmpay_public_key.pem');

  assert(fs.existsSync(privKeyPath), 'Merchant private key exists');
  assert(fs.existsSync(merchantPubKeyPath), 'Merchant public key exists');
  assert(fs.existsSync(platformPubKeyPath), 'PalmPay platform public key exists');

  const privKey = fs.readFileSync(privKeyPath, 'utf8');
  const merchantPubKey = fs.readFileSync(merchantPubKeyPath, 'utf8');

  // Verify key pair mathematics
  const testPayload = {
    orderNo: 'TEST_ORD_' + Date.now(),
    orderStatus: 2,
    orderAmount: 250000, // 2,500 NGN in kobo
    currency: 'NGN',
    virtualAccountNo: '9997145441'
  };

  const sortedKeys = Object.keys(testPayload).sort();
  const strA = sortedKeys.map(k => `${k}=${String(testPayload[k]).trim()}`).join('&');
  const md5Str = crypto.createHash('md5').update(strA).digest('hex').toUpperCase();

  const signer = crypto.createSign('RSA-SHA1');
  signer.update(md5Str);
  const signature = signer.sign(privKey, 'base64');

  const verifier = crypto.createVerify('RSA-SHA1');
  verifier.update(md5Str);
  const sigValid = verifier.verify(merchantPubKey, signature, 'base64');
  assert(sigValid, 'RSA-SHA1 with MD5 signature generates and verifies cleanly');

  // -------------------------------------------------------------------------
  // Test 2: Live Health Check Endpoint
  // -------------------------------------------------------------------------
  console.log('\n[2/6] Webhook Health Check (GET /api/webhooks/palmpay)');
  try {
    const res = await fetch(`${TARGET_HOST}/api/webhooks/palmpay`);
    assert(res.status === 200, `Health check HTTP status is 200 (got ${res.status})`);
    const json = await res.json();
    assert(json.success === true, 'JSON response has success=true');
    assert(json.status === 'OPERATIONAL', 'JSON response status is OPERATIONAL');
  } catch (err) {
    assert(false, `Health check request failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 3: Webhook Security (Invalid / Missing Signature Rejection)
  // -------------------------------------------------------------------------
  console.log('\n[3/6] Webhook Security: Signature Tampering Protection');
  try {
    const resNoSig = await fetch(`${TARGET_HOST}/api/webhooks/palmpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNo: 'FAKE_ORDER_001', amount: 5000 })
    });
    assert(resNoSig.status === 400, `Unsigned webhook rejected with HTTP 400 (got ${resNoSig.status})`);
    const textNoSig = await resNoSig.text();
    assert(textNoSig.includes('Invalid signature'), `Response body contains "Invalid signature" (got "${textNoSig}")`);

    const resBadSig = await fetch(`${TARGET_HOST}/api/webhooks/palmpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Signature': 'bad_forged_base64_signature=='
      },
      body: JSON.stringify({ orderNo: 'FAKE_ORDER_002', amount: 5000 })
    });
    assert(resBadSig.status === 400, `Tampered signature rejected with HTTP 400 (got ${resBadSig.status})`);
  } catch (err) {
    assert(false, `Signature security check failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 4: Virtual Account Generation Auth Check
  // -------------------------------------------------------------------------
  console.log('\n[4/6] Virtual Account API: Authentication Enforcement');
  try {
    const resNoAuth = await fetch(`${TARGET_HOST}/api/virtual-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bvn: '12345678901' })
    });
    assert(resNoAuth.status === 401, `Unauthenticated request rejected with HTTP 401 (got ${resNoAuth.status})`);
  } catch (err) {
    assert(false, `Auth enforcement check failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 5: Virtual Account BVN Requirement & Strict Rejection of Fake Generation
  // -------------------------------------------------------------------------
  console.log('\n[5/6] Virtual Account API: BVN Validation & No Fake Numbers');
  try {
    // Missing BVN
    const resMissingBvn = await fetch(`${TARGET_HOST}/api/virtual-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_API_KEY}`
      },
      body: JSON.stringify({})
    });
    assert(resMissingBvn.status === 400, `Missing BVN rejected with HTTP 400 (got ${resMissingBvn.status})`);
    const jsonMissing = await resMissingBvn.json();
    assert(
      jsonMissing.message.includes('A valid 11-digit BVN'),
      `Returned clear requirement message: "${jsonMissing.message}"`
    );

    // Invalid length BVN
    const resShortBvn = await fetch(`${TARGET_HOST}/api/virtual-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_API_KEY}`
      },
      body: JSON.stringify({ bvn: '12345' })
    });
    assert(resShortBvn.status === 400, `Short BVN rejected with HTTP 400 (got ${resShortBvn.status})`);
    const jsonShort = await resShortBvn.json();
    assert(
      jsonShort.message === 'BVN must be exactly 11 digits.',
      `Returned exact length error: "${jsonShort.message}"`
    );

    // 11-digit invalid BVN -> Must contact PalmPay and NOT create fake number
    const resInvalidBvn = await fetch(`${TARGET_HOST}/api/virtual-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_API_KEY}`
      },
      body: JSON.stringify({ bvn: '12345678901', accountName: 'Test Identity' })
    });
    assert(resInvalidBvn.status === 400, `Invalid BVN rejected with HTTP 400 from PalmPay (got ${resInvalidBvn.status})`);
    const jsonInvalid = await resInvalidBvn.json();
    assert(
      jsonInvalid.message.includes('PalmPay Virtual Account Creation Failed') || jsonInvalid.message.includes('unknow exception'),
      `Bubbled real PalmPay error: "${jsonInvalid.message}"`
    );
    assert(
      !jsonInvalid.data?.accountNumber?.startsWith('99'),
      'CONFIRMED: Fake 99xxxxxxxx account number was NOT generated'
    );
  } catch (err) {
    assert(false, `Virtual account validation check failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 6: PalmPay Outbound Live Gateway Connection
  // -------------------------------------------------------------------------
  console.log('\n[6/6] PalmPay Gateway Direct Connectivity');
  try {
    const palmPayBaseUrl = 'https://open-gw-prod.palmpay-inc.com/api/v2';
    const testOutboundPayload = {
      accountName: 'Connection Check',
      customerName: 'Connection Check',
      email: 'test@vtstack.ng',
      identityType: 'personal',
      licenseNumber: '11111111111',
      accountReference: `VA-TEST-${Date.now()}`,
      nonceStr: crypto.randomBytes(16).toString('hex'),
      requestTime: Date.now(),
      version: 'V2.0'
    };

    const outSortedKeys = Object.keys(testOutboundPayload).sort();
    const outStrA = outSortedKeys.map(k => `${k}=${String(testOutboundPayload[k]).trim()}`).join('&');
    const outMd5 = crypto.createHash('md5').update(outStrA).digest('hex').toUpperCase();
    const outSigner = crypto.createSign('RSA-SHA1');
    outSigner.update(outMd5);
    const outSig = outSigner.sign(privKey, 'base64');

    const outRes = await fetch(`${palmPayBaseUrl}/virtual/account/label/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Accept': 'application/json',
        'CountryCode': 'NG',
        'countryCode': 'NG',
        'Authorization': `Bearer L260210154221388684191`,
        'AppId': 'L260210154221388684191',
        'Merchant-Code': '123113005404881',
        'Signature': outSig
      },
      body: JSON.stringify(testOutboundPayload)
    });

    assert(outRes.status === 200, `PalmPay Gateway responded with HTTP 200 (got ${outRes.status})`);
    const outJson = await outRes.json();
    assert(outJson.respCode !== 'OPEN_GW_000008', 'PalmPay accepted request signature without security validate fail');
    console.log(`  PalmPay gateway live response code: ${outJson.respCode} (${outJson.respMsg})`);
  } catch (err) {
    assert(false, `Gateway connectivity check failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
