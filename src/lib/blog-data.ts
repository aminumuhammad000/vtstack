export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: 'Virtual Accounts' | 'KYC & Verification' | 'Developer & Webhooks' | 'Payouts & Settlements' | 'Security & Setup';
  readTime: string;
  publishedAt: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  tags: string[];
  content: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-generate-real-palmpay-virtual-accounts',
    title: 'Complete Guide: How to Generate Real PalmPay Virtual Accounts on VTStack',
    excerpt: 'Learn how to generate real PalmPay dedicated virtual bank accounts for your customers, why an 11-digit BVN is mandatory, and how funds automatically credit your wallet upon transfer.',
    category: 'Virtual Accounts',
    readTime: '6 min read',
    publishedAt: 'November 15, 2026',
    author: {
      name: 'Aminu Muhammad',
      role: 'Founder & Technical Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
    },
    tags: ['Virtual Accounts', 'PalmPay', 'NUBAN', 'Collections', 'BVN'],
    content: `
Virtual Accounts are the backbone of modern automated collections in Nigeria. Instead of sharing a single corporate bank account and asking customers to upload payment receipts, VTStack issues real, dedicated PalmPay NUBAN account numbers mapped directly to your user accounts.

When a customer transfers money from any Nigerian bank app such as GTBank, Access Bank, Zenith Bank, Kuda, or OPay to their dedicated PalmPay account, the payment is verified via instant webhook and credited directly to your VTStack wallet.

## 1. Why Real Virtual Accounts Require BVN or NIN Verification

In compliance with the Central Bank of Nigeria (CBN) Tier-1 banking regulations and PalmPay's compliance framework:

- Real NUBAN Accounts: VTStack strictly interfaces with PalmPay's live V2 banking gateway (/api/v2/virtual/account/label/create) to generate genuine 10-digit NUBAN accounts.
- Identity Verification: An 11-digit Bank Verification Number (BVN) or National Identity Number (NIN) matching the customer's legal name is mandatory.
- Instant Activation: Real virtual accounts are generated instantly once the identity details pass verification.

> Important Note: Fake or placeholder BVNs (such as 12345678901) will be rejected by the PalmPay gateway. Always ensure the BVN or NIN matches the customer's real name.

## 2. Step-by-Step: Generating a Virtual Account on the Dashboard

Follow these simple steps to generate your first collection account:

### Step 1: Sign In and Navigate to Virtual Accounts
1. Log in to your account at https://vtstack.ng/login
2. From the user sidebar, click on Virtual Accounts.
3. You will see your existing active collection accounts and summary statistics.

### Step 2: Open Account Creation
1. Click the "Create Virtual Account" button at the top right of the page.
2. The account creation modal will appear.

### Step 3: Enter Legal Details
Provide the following information:
- Customer / Account Name: Enter the full legal name (for example, Aminu Muhammad).
- Email Address: The customer's active email for transaction receipts.
- Account Alias: A friendly label (for example, Main Store Collection or Client Deposits).
- Identity Verification: Enter the 11-digit BVN or National Identity Number.

### Step 4: Submit and Confirm
1. Click "Generate Real Account".
2. VTStack encrypts and transmits the request directly to PalmPay's banking infrastructure.
3. Within 1 to 3 seconds, your real PalmPay NUBAN (10 digits), Account Name, and Bank Name (PalmPay) will be created and displayed on your dashboard.

## 3. How Bank Transfers Credit Your Wallet

Once your account is created, you can accept live customer payments:

1. Customer Transfer: The customer opens any Nigerian mobile banking app, selects PalmPay as the destination bank, and enters their 10-digit virtual account number.
2. Account Name Resolution: The bank app displays the resolved account name (for example, VTStack - Aminu Muhammad).
3. PalmPay Instant Webhook: When the transfer is completed, PalmPay dispatches a cryptographically signed webhook to https://vtstack.ng/api/webhooks/palmpay.
4. Signature Verification: VTStack verifies the incoming RSA-SHA1 digital signature using PalmPay's platform public key.
5. Instant Wallet Credit: Your wallet balance is credited in real time.
6. Transaction Ledger: A detailed transaction receipt is saved, and you receive an instant in-app notification.

## 4. Generating Virtual Accounts via API (For Developers)

If you are building an automated platform or mobile app, you can create virtual accounts programmatically:

\`\`\`bash
curl -X POST https://vtstack.ng/api/virtual-accounts \\
  -H "Authorization: Bearer vtp_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customerName": "Aminu Muhammad",
    "email": "customer@example.com",
    "bvn": "12345678901",
    "alias": "Primary Checkout"
  }'
\`\`\`

### Example JSON Response:
\`\`\`json
{
  "success": true,
  "message": "Real PalmPay virtual account created successfully.",
  "data": {
    "accountNumber": "9901827364",
    "accountName": "VTStack - Aminu Muhammad",
    "bankName": "PalmPay",
    "bankType": "palmpay",
    "reference": "VA-1794768981",
    "status": "active"
  }
}
\`\`\`

## 5. Troubleshooting Common Issues

- Error: BVN must be exactly 11 digits: Double-check that your BVN contains exactly 11 numeric characters without spaces or dashes.
- Error: licenseNumber duplicate: This BVN or NIN has already been used to generate an active account.
- Transfer Not Showing: Transfers are credited within seconds. If there is a delay from the sending bank, check your Transactions tab or verify with the session ID.
    `
  },
  {
    slug: 'kyc-verification-tier1-to-tier3-guide',
    title: 'Step-by-Step KYC Verification: Upgrading from Tier 1 to Tier 3 on VTStack',
    excerpt: 'Understand VTStack KYC requirements, document formats, daily and monthly transaction limits, and how to verify your account for enterprise-scale payouts.',
    category: 'KYC & Verification',
    readTime: '5 min read',
    publishedAt: 'November 14, 2026',
    author: {
      name: 'Aminu Muhammad',
      role: 'Founder & Technical Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
    },
    tags: ['KYC', 'Compliance', 'Tier Limits', 'NIN', 'CAC', 'Identity'],
    content: `
VTStack complies with Central Bank of Nigeria (CBN) Anti-Money Laundering (AML) and Combating the Financing of Terrorism (CFT) requirements. To protect your business and enable higher withdrawal and deposit limits, we offer a 3-tier verification structure.

## 1. Overview of KYC Tiers and Transaction Limits

- Tier 1 (Basic Account):
  Requires BVN, NIN, verified email, and phone number.
  Daily deposit limit: NGN 100,000.
  Daily withdrawal limit: NGN 50,000.
  Monthly transaction limit: NGN 1,000,000.

- Tier 2 (Verified Individual):
  Requires Tier 1 plus Government ID and a live selfie.
  Daily deposit limit: NGN 500,000.
  Daily withdrawal limit: NGN 200,000.
  Monthly transaction limit: NGN 5,000,000.

- Tier 3 (Enterprise / Registered Business):
  Requires Tier 2 plus Utility Bill and CAC Registration documents.
  Daily deposit limit: NGN 5,000,000.
  Daily withdrawal limit: NGN 1,000,000.
  Monthly transaction limit: Unlimited.

## 2. Completing Tier 1 Verification

Tier 1 is automatically completed upon registration:
1. Provide your full legal first name, last name, phone number, and email.
2. Verify your email with the 6-digit OTP sent to your inbox.
3. Submit your 11-digit BVN or NIN.

## 3. Upgrading to Tier 2 (Government ID and Selfie)

To increase your daily withdrawal limit to NGN 200,000:
1. Navigate to Settings and click Verification and KYC on your user dashboard.
2. Select Tier 2 Verification.
3. Upload Valid Government ID:
   Accepted documents include Nigerian International Passport, National Identity Management Commission (NIMC) Card or Slip, Driver's License, or INEC Voter Card.
   Format: Clear, readable JPG, PNG, or PDF under 5MB.
4. Live Selfie: Take a clear front-facing photo in good lighting.
5. Our automated compliance service verifies the document. Most submissions are approved within 15 to 30 minutes.

## 4. Upgrading to Tier 3 (Corporate / Enterprise)

For registered companies, fintechs, and high-volume merchants:
1. Under Verification and KYC, click Upgrade to Tier 3.
2. Business Registration (CAC):
   Provide your Registered Company (RC) or Business Name (BN) number.
   Upload your CAC Certificate of Incorporation and Status Report.
3. Proof of Address:
   Upload a recent electricity bill, water bill, or bank statement dated within the last 3 months.
4. Submit for review. Our compliance team approves Tier 3 applications within 24 hours.
    `
  },
  {
    slug: 'developer-integration-api-keys-and-webhooks',
    title: 'Developer Integration Guide: API Keys, Webhooks, and Idempotency',
    excerpt: 'Integrate VTStack into your custom application. Master API key authentication, webhook signature verification with RSA-SHA1, and duplicate transfer protection.',
    category: 'Developer & Webhooks',
    readTime: '8 min read',
    publishedAt: 'November 12, 2026',
    author: {
      name: 'Aminu Muhammad',
      role: 'Founder & Technical Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
    },
    tags: ['API Keys', 'Webhooks', 'RSA-SHA1', 'Node.js', 'Python', 'Idempotency'],
    content: `
VTStack provides a modern RESTful API designed for fintech builders, e-commerce stores, and digital platforms. This guide explains how to authenticate requests, set up webhook listeners, and verify incoming transfer signatures.

## 1. Generating Your API Keys

VTStack provides dual-environment API keys:
- Test Keys (vtp_test_...): For local development and sandbox simulations.
- Live Keys (vtp_live_...): For real financial transactions in production.

### How to get your keys:
1. Go to Dashboard, click Developer, then select API Keys.
2. Click Generate New Key Pair.
3. Copy your live and test keys and store them securely in your environment variables (.env). Never commit API keys to public repositories.

## 2. Authenticating API Requests

Pass your API key in the Authorization header as a Bearer token or via the x-api-key header:

\`\`\`http
GET /api/wallet HTTP/1.1
Host: vtstack.ng
Authorization: Bearer vtp_live_YOUR_SECRET_KEY
Content-Type: application/json
\`\`\`

## 3. Configuring Webhooks

When a customer pays into a virtual account or a payout completes, VTStack pushes an instant notification to your webhook URL.

### Setting your Webhook URL:
1. Go to Dashboard, click Developer, then select Webhook Settings.
2. Enter your HTTPS endpoint (for example, https://api.yourdomain.com/webhooks/vtstack).
3. Click Save and Test Endpoint. Our system will send a test ping to verify reachability.

## 4. Verifying Incoming Webhook Signatures

To ensure incoming notifications genuinely originate from VTStack and PalmPay, verify the digital signature sent in the Signature header.

### Algorithm Standard:
1. Sort all non-empty payload keys in ASCII alphabetical order.
2. Join keys and values in format key1=val1&key2=val2.
3. Compute uppercase MD5 hash of the concatenated string.
4. Verify using RSA-SHA1 with the platform public key.

### Node.js Verification Example:
\`\`\`javascript
const crypto = require('crypto');

function verifySignature(payload, signature, publicKey) {
  const sortedKeys = Object.keys(payload).sort();
  const strA = sortedKeys
    .filter(k => k !== 'signature' && payload[k] !== undefined)
    .map(k => \`\${k}=\${String(payload[k]).trim()}\`)
    .join('&');

  const md5Hash = crypto.createHash('md5').update(strA).digest('hex').toUpperCase();

  const verifier = crypto.createVerify('RSA-SHA1');
  verifier.update(md5Hash);
  return verifier.verify(publicKey, signature, 'base64');
}
\`\`\`

## 5. Idempotency and Replay Protection

Always store the orderNo or reference in your database with a unique constraint. If your server receives a duplicate webhook notification with an already-processed reference, immediately acknowledge with HTTP 200 success without crediting the customer a second time.
    `
  },
  {
    slug: 'how-to-request-and-automate-payouts-and-settlements',
    title: 'How to Request and Automate Payouts and Daily Bank Settlements',
    excerpt: 'Step-by-step tutorial on adding settlement bank accounts, setting a 4-digit transaction PIN, configuring automatic T+1 settlements, and sending bulk payouts.',
    category: 'Payouts & Settlements',
    readTime: '5 min read',
    publishedAt: 'November 10, 2026',
    author: {
      name: 'Aminu Muhammad',
      role: 'Founder & Technical Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
    },
    tags: ['Payouts', 'Settlements', 'Banking', 'PIN', 'Automation'],
    content: `
Collecting customer payments is only half of the journey. Withdrawing your funds smoothly to your commercial bank account is equally important. VTStack provides instant manual payouts as well as fully automated daily settlements.

## 1. Setting Up Your 4-Digit Transaction PIN

For security, every payout requires authorization with a confidential 4-digit Transaction PIN:
1. In your dashboard, go to Settings and select Security.
2. Click Set Transaction PIN.
3. Enter a 4-digit numeric code and confirm your password.
4. Your PIN is securely hashed using bcrypt and stored with bank-grade encryption.

## 2. Requesting Payout Access

For new merchants, payout access is granted upon basic KYC completion:
1. Navigate to Payouts in your dashboard.
2. Click Request Payout Access.
3. State your business purpose and expected daily volume.
4. Approvals are typically completed within a few hours.

## 3. Adding and Verifying Destination Bank Accounts

1. Under Payouts, click Saved Accounts, then click Add Bank Account.
2. Select your commercial bank such as Access Bank, GTBank, FirstBank, Zenith, Kuda, or PalmPay.
3. Enter your 10-digit NUBAN account number.
4. VTStack automatically queries the CBN NIBSS directory to resolve the legal account name. Confirm and save.

## 4. Automating Daily Settlements

If you prefer automatic daily transfers to your bank account without logging in every day:
1. Go to Settings and select Settlements.
2. Toggle on Automated Daily Settlement.
3. Select your preferred primary settlement bank account.
4. Choose your settlement schedule: Daily at midnight or Twice Daily.
5. All cleared funds above your minimum retention balance will automatically transfer to your bank.
    `
  },
  {
    slug: 'securing-your-vtstack-account-pin-2fa-and-ip-whitelist',
    title: 'Securing Your VTStack Account: 2FA, Transaction PINs, and IP Whitelisting',
    excerpt: 'Best security practices to protect your merchant wallet, prevent unauthorized payouts, and whitelist server IPs for API operations.',
    category: 'Security & Setup',
    readTime: '4 min read',
    publishedAt: 'November 08, 2026',
    author: {
      name: 'Aminu Muhammad',
      role: 'Founder & Technical Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
    },
    tags: ['Security', '2FA', 'IP Whitelist', 'PIN', 'Authentication'],
    content: `
Financial infrastructure demands uncompromising security. VTStack incorporates multi-layered defense mechanisms to safeguard your business funds.

## 1. Enable Two-Factor Authentication (2FA)

Add a second layer of verification for all logins:
1. Go to Settings, select Security, and choose Two-Factor Authentication.
2. Scan the QR code using Google Authenticator, Authy, or 1Password.
3. Enter the 6-digit verification code to confirm activation.

## 2. API Server IP Whitelisting

If you are executing payouts or withdrawals via API, you can restrict API requests to only originate from your server's static IP address:
1. Go to Developer, then select Security and Whitelisting.
2. Add your production server IPv4 address (for example, 16.171.175.110).
3. Any API payout attempt originating from an unrecognized IP address will be blocked immediately with HTTP 403 Forbidden.

## 3. Dedicated Transaction PIN

Never share your 4-digit PIN with team members. If you need team access, assign sub-admin roles with view-only or accountant permissions rather than sharing master credentials.
    `
  },
  {
    slug: 'frequently-asked-questions-and-support-guide',
    title: 'Frequently Asked Questions and Merchant Support Guide',
    excerpt: 'Clear answers to common merchant questions regarding PalmPay virtual accounts, wallet clearance dates, transaction fees, and live merchant support.',
    category: 'Security & Setup',
    readTime: '4 min read',
    publishedAt: 'November 05, 2026',
    author: {
      name: 'Aminu Muhammad',
      role: 'Founder & Technical Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
    },
    tags: ['FAQ', 'Support', 'Troubleshooting', 'Merchant Guide'],
    content: `
Have questions about fees, accounts, or verification? Here are quick answers to the most common merchant inquiries:

## 1. What banks are issued for Virtual Accounts?
VTStack partners directly with PalmPay to issue dedicated 10-digit NUBAN virtual accounts. Customers can transfer to your PalmPay virtual account from any bank in Nigeria.

## 2. What is the fee for virtual account collections?
Standard collection fees range between 0.5% and 1.0% capped at competitive rates. There are no monthly maintenance fees or hidden charges.

## 3. When do deposited funds become available?
Virtual account deposits credit your wallet in real time. Depending on your KYC tier and risk settings, funds are instantly cleared for outgoing payouts or settled on your configured daily schedule.

## 4. Why did my virtual account creation fail?
Common causes:
1. The 11-digit BVN or NIN does not match the legal customer name entered.
2. The BVN or NIN has already been registered for an active virtual account.
3. PalmPay business configuration is pending.

## 5. How do I contact official merchant support?
You can reach our dedicated support desk directly:
- Email Support: support@vtstack.ng
- Phone and WhatsApp: 08024230597
- Dashboard: Submit a ticket directly under Help and Support.
    `
  }
];
