import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface CreateVirtualAccountInput {
  accountName: string;
  customerName: string;
  email: string;
  bvn?: string;
  nin?: string;
  cacNumber?: string;
  identityType?: 'personal' | 'personal_nin' | 'company';
  accountReference?: string;
}

export interface PalmPayVirtualAccountResponse {
  virtualAccountNo: string;
  virtualAccountName: string;
  bankName: string;
  bankCode: string;
  accountReference: string;
  status: string;
  raw?: any;
}

export interface PalmPayWebhookDeposit {
  orderNo: string;
  orderStatus: number | string;
  amount: number; // in NGN
  rawAmount: number; // original minor units / kobo
  currency: string;
  virtualAccountNo: string;
  virtualAccountName?: string;
  accountReference?: string;
  payerName?: string;
  payerAccountNo?: string;
  payerBankName?: string;
  sessionId?: string;
  raw: any;
}

export class PalmPayService {
  private baseUrl: string;
  private appId: string;
  private merchantId: string;
  private privateKey: string = '';
  private publicKey: string = '';
  private merchantPublicKey: string = '';
  private webhookSecret: string = '';

  constructor() {
    this.baseUrl = (process.env.PALMPAY_BASE_URL || 'https://open-gw-prod.palmpay-inc.com/api/v2').replace(/\/+$/, '');
    this.appId = process.env.PALMPAY_APP_ID || 'L260210154221388684191';
    this.merchantId = process.env.PALMPAY_MERCHANT_ID || '123113005404881';
    this.webhookSecret = process.env.PALMPAY_WEBHOOK_SECRET || process.env.VTPAY_WEBHOOK_SECRET || '';

    this.loadKeys();
  }

  private loadKeys() {
    // 1. Private Key (Merchant Private Key used to sign requests sent to PalmPay)
    let priv = process.env.PALMPAY_PRIVATE_KEY || '';
    if (!priv) {
      const candidates = [
        path.join(process.cwd(), 'legacy/server/src/config/palmpay_private_key.pem'),
        path.join(process.cwd(), 'palmpay_private_key.pem')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          try {
            priv = fs.readFileSync(p, 'utf8');
            break;
          } catch (e) {}
        }
      }
    }

    if (priv) {
      let formatted = priv.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
      if (!formatted.startsWith('-----BEGIN PRIVATE KEY-----') && !formatted.startsWith('-----BEGIN RSA PRIVATE KEY-----')) {
        formatted = `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`;
      }
      this.privateKey = formatted;
    }

    // 2. Public Key (PalmPay Public Key used to verify webhooks received from PalmPay)
    let pub = process.env.PALMPAY_PUBLIC_KEY || '';
    if (!pub) {
      const candidates = [
        path.join(process.cwd(), 'legacy/server/src/config/palmpay_public_key.pem'),
        path.join(process.cwd(), 'palmpay_public_key.pem')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          try {
            pub = fs.readFileSync(p, 'utf8');
            break;
          } catch (e) {}
        }
      }
    }

    if (pub) {
      let formatted = pub.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
      if (!formatted.startsWith('-----BEGIN PUBLIC KEY-----')) {
        formatted = `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
      }
      this.publicKey = formatted;
    }

    // 3. Merchant Public Key (Used to verify simulated / merchant-signed test webhooks)
    let merchantPub = process.env.PALMPAY_MERCHANT_PUBLIC_KEY || '';
    if (!merchantPub) {
      const candidates = [
        path.join(process.cwd(), 'legacy/server/src/config/palmpay_merchant_public_key.pem'),
        path.join(process.cwd(), 'palmpay_merchant_public_key.pem')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          try {
            merchantPub = fs.readFileSync(p, 'utf8');
            break;
          } catch (e) {}
        }
      }
    }

    if (merchantPub) {
      let formatted = merchantPub.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
      if (!formatted.startsWith('-----BEGIN PUBLIC KEY-----')) {
        formatted = `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
      }
      this.merchantPublicKey = formatted;
    }
  }

  /**
   * Generates PalmPay V2 RSA-SHA1 signature:
   * 1. Sort non-empty top-level keys ASCII alphabetically
   * 2. Form query string key1=val1&key2=val2
   * 3. Compute MD5 and convert to uppercase
   * 4. Sign md5Str with Merchant Private Key using SHA1withRSA (RSA_PKCS1_PADDING)
   */
  public generateSignature(params: Record<string, any>): string {
    if (!this.privateKey) {
      throw new Error('PalmPay private key not configured');
    }

    const filteredKeys = Object.keys(params)
      .filter(k => params[k] !== null && params[k] !== undefined && String(params[k]).trim() !== '' && k !== 'signature' && k !== 'sign')
      .sort();

    const strA = filteredKeys.map(k => `${k}=${String(params[k]).trim()}`).join('&');
    const md5Str = crypto.createHash('md5').update(strA).digest('hex').toUpperCase();

    const sign = crypto.sign('sha1', Buffer.from(md5Str), {
      key: this.privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING
    });

    return sign.toString('base64');
  }

  /**
   * Request PalmPay to create a real Dedicated Virtual Account
   */
  public async createVirtualAccount(input: CreateVirtualAccountInput): Promise<PalmPayVirtualAccountResponse> {
    const licenseNumber = input.bvn || input.nin || input.cacNumber || '';
    if (!licenseNumber) {
      throw new Error('A valid BVN or NIN is required by PalmPay to generate a real virtual account');
    }

    const identityType = input.identityType || (input.cacNumber ? 'company' : input.nin ? 'personal_nin' : 'personal');
    const accountReference = input.accountReference || `VA-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const accountName = input.accountName || input.customerName;

    const payload: Record<string, any> = {
      virtualAccountName: accountName,
      accountName: accountName,
      customerName: input.customerName || accountName,
      email: input.email,
      identityType: identityType,
      licenseNumber: licenseNumber,
      accountReference: accountReference,
      nonceStr: crypto.randomBytes(16).toString('hex'),
      requestTime: Date.now(),
      version: 'V2.0'
    };

    const signature = this.generateSignature(payload);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'CountryCode': 'NG',
      'Authorization': `Bearer ${this.appId}`,
      'Signature': signature
    };

    // Ensure endpoint path matches PalmPay v2 standard
    const endpoint = this.baseUrl.endsWith('/api/v2')
      ? `${this.baseUrl}/virtual/account/label/create`
      : `${this.baseUrl}/api/v2/virtual/account/label/create`;

    console.log(`[PalmPay] Calling ${endpoint} for customer: ${input.customerName}, license: ***${licenseNumber.slice(-4)}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const resText = await response.text();
    let resJson: any = null;
    try {
      resJson = JSON.parse(resText);
    } catch {
      throw new Error(`PalmPay gateway returned non-JSON response (HTTP ${response.status}): ${resText.slice(0, 200)}`);
    }

    console.log('[PalmPay Response]:', JSON.stringify(resJson));

    // PalmPay success codes: '00000000', '00', '0'
    const isSuccess = resJson.respCode === '00000000' || resJson.respCode === '00' || resJson.respCode === '0';

    if (!isSuccess || !resJson.data) {
      let msg = resJson.respMsg || resJson.message || `PalmPay error ${resJson.respCode || 'UNKNOWN'}`;
      if (resJson.respCode === 'AC100009') {
        msg = 'This BVN or identity number is already registered for an active virtual account.';
      } else if (resJson.respCode === 'OPEN_GW_000017') {
        msg = "PalmPay gateway error: 'unknow exception' (OPEN_GW_000017). Please verify API credentials and headers.";
      }
      throw new Error(`PalmPay Virtual Account Creation Failed: ${msg}`);
    }

    const data = resJson.data;
    const virtualAccountNo = data.virtualAccountNo || data.accountNumber;
    const virtualAccountName = data.virtualAccountName || data.accountName || accountName;

    if (!virtualAccountNo) {
      throw new Error('PalmPay returned success but no virtual account number was provided in data');
    }

    return {
      virtualAccountNo,
      virtualAccountName,
      bankName: 'PalmPay',
      bankCode: '100033',
      accountReference,
      status: data.status || 'active',
      raw: data
    };
  }

  /**
   * Verify incoming Webhook signature from PalmPay
   */
  public verifyWebhookSignature(rawPayload: string, rawSignature: string, body?: any): boolean {
    if (process.env.PALMPAY_SKIP_SIG_VERIFY === 'true') {
      console.warn('[PalmPay Webhook] ⚠️ PALMPAY_SKIP_SIG_VERIFY=true is active. Skipping signature validation.');
      return true;
    }

    if (!rawSignature && body?.sign) {
      rawSignature = body.sign;
    }

    if (!rawSignature) {
      console.error('[PalmPay Webhook] Missing signature in headers or body');
      return false;
    }

    const signature = rawSignature.includes('%') ? decodeURIComponent(rawSignature) : rawSignature;

    // 1. If HMAC secret is configured and matches
    if (this.webhookSecret && this.webhookSecret !== 'default-webhook-secret' && this.webhookSecret !== 'your_actual_webhook_secret_here') {
      try {
        const expectedHmac = crypto.createHmac('sha256', this.webhookSecret).update(rawPayload).digest('hex');
        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac))) {
          console.log('[PalmPay Webhook] ✅ Signature verified via HMAC-SHA256');
          return true;
        }
      } catch (e) {}
    }

    // 2. RSA Verification with PalmPay Public Key (and Merchant Public Key for tests)
    const candidateKeys = [this.publicKey, this.merchantPublicKey].filter(Boolean);
    if (candidateKeys.length === 0) {
      console.warn('[PalmPay Webhook] No public key loaded, unable to verify RSA signature');
      return false;
    }

    for (const key of candidateKeys) {
      // Attempt 1: RSA-SHA256 on raw payload
      try {
        const verify256 = crypto.createVerify('RSA-SHA256');
        verify256.update(rawPayload);
        if (verify256.verify(key, signature, 'base64')) {
          console.log('[PalmPay Webhook] ✅ Verified via RSA-SHA256');
          return true;
        }
      } catch (e) {}

      // Attempt 2: RSA-SHA1 on raw payload
      try {
        const verify1 = crypto.createVerify('RSA-SHA1');
        verify1.update(rawPayload);
        if (verify1.verify(key, signature, 'base64')) {
          console.log('[PalmPay Webhook] ✅ Verified via RSA-SHA1');
          return true;
        }
      } catch (e) {}

      // Attempt 3: RSA-SHA1 on MD5(rawPayload).toUpperCase()
      try {
        const md5Hash = crypto.createHash('md5').update(rawPayload).digest('hex').toUpperCase();
        const verifyMD5 = crypto.createVerify('RSA-SHA1');
        verifyMD5.update(md5Hash);
        if (verifyMD5.verify(key, signature, 'base64')) {
          console.log('[PalmPay Webhook] ✅ Verified via RSA-SHA1 + MD5(payload)');
          return true;
        }
      } catch (e) {}

      // Attempt 4: Sorted Body Parameters style (PalmPay V2 canonical standard)
      if (body && typeof body === 'object') {
        const targets = [body, body.data].filter(t => t && typeof t === 'object');
        for (const target of targets) {
          try {
            const filteredParams: Record<string, any> = {};
            for (const k of Object.keys(target).sort()) {
              if (k !== 'sign' && k !== 'signature' && target[k] !== undefined && target[k] !== null && target[k] !== '' && typeof target[k] !== 'object') {
                filteredParams[k] = String(target[k]).trim();
              }
            }
            if (Object.keys(filteredParams).length > 0) {
              const strA = Object.keys(filteredParams).map(k => `${k}=${filteredParams[k]}`).join('&');
              const md5Hash = crypto.createHash('md5').update(strA).digest('hex').toUpperCase();
              const verifyBody = crypto.createVerify('RSA-SHA1');
              verifyBody.update(md5Hash);
              if (verifyBody.verify(key, signature, 'base64')) {
                console.log('[PalmPay Webhook] ✅ Verified via sorted body parameters RSA-SHA1+MD5');
                return true;
              }
            }
          } catch (e) {}
        }
      }
    }

    console.error('[PalmPay Webhook] ❌ Signature verification failed across all algorithms');
    return false;
  }

  /**
   * Parse PalmPay deposit webhook payload
   */
  public parseDepositWebhook(body: any): PalmPayWebhookDeposit | null {
    const data = body.data || body;
    const orderNo = data.orderNo || data.transId || data.paymentReference || data.orderId;
    if (!orderNo) return null;

    // Determine amount in NGN
    let amount = 0;
    const rawAmount = Number(data.orderAmount ?? data.amount ?? data.transAmount ?? 0);

    if (data.orderAmount !== undefined && data.orderAmount !== null) {
      // PalmPay V2 official spec: orderAmount is Long in cents/kobo (100 kobo = 1 NGN)
      amount = Number(data.orderAmount) / 100;
    } else if (data.amount !== undefined && data.amount !== null) {
      const parsedAmt = Number(data.amount);
      // If amount is integer >= 1000 without decimal, treat as minor unit if reasonable, else major
      amount = parsedAmt;
    } else if (data.transAmount !== undefined && data.transAmount !== null) {
      const parsedAmt = Number(data.transAmount);
      amount = parsedAmt >= 100 && Number.isInteger(parsedAmt) ? parsedAmt / 100 : parsedAmt;
    } else {
      amount = rawAmount;
    }

    const virtualAccountNo = data.virtualAccountNo || data.virtualAccount || data.accountNumber;
    const payerName = data.payerAccountName || data.payerName || data.customerName;
    const payerAccountNo = data.payerAccountNo || data.payerAccount || data.customerAccount;
    const payerBankName = data.payerBankName || data.bankName || 'PalmPay';
    const orderStatus = data.orderStatus !== undefined ? data.orderStatus : (data.status || data.transStatus);

    return {
      orderNo,
      orderStatus,
      amount,
      rawAmount,
      currency: data.currency || 'NGN',
      virtualAccountNo,
      virtualAccountName: data.virtualAccountName,
      accountReference: data.accountReference || data.reference,
      payerName,
      payerAccountNo,
      payerBankName,
      sessionId: data.sessionId,
      raw: data
    };
  }
}

export const palmpayService = new PalmPayService();
export default palmpayService;
