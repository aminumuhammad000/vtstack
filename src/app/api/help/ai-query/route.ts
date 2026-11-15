import { NextRequest, NextResponse } from 'next/server';
import { BLOG_POSTS } from '@/lib/blog-data';

interface KnowledgeItem {
  keywords: string[];
  title: string;
  answer: string;
  relatedSlug?: string;
  steps?: string[];
}

const KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    keywords: ['virtual account', 'palmpay', 'nuban', 'create account', 'generate account', 'bank transfer', 'collection'],
    title: 'How to Generate Real PalmPay Virtual Accounts',
    answer: 'VTStack generates real 10-digit PalmPay NUBAN virtual accounts for automated collections. By Central Bank of Nigeria (CBN) regulations, a valid 11-digit BVN or NIN matching your legal name is mandatory to prevent fraud and ensure instant NIBSS clearing.',
    relatedSlug: 'how-to-generate-real-palmpay-virtual-accounts',
    steps: [
      'Log into your dashboard at vtstack.ng and click "Virtual Accounts".',
      'Click "Create Virtual Account" at the top right.',
      'Enter the customer name, email, and 11-digit BVN or NIN.',
      'Click "Generate Real Account". Your PalmPay account number will appear in seconds.',
      'Any transfer from any Nigerian bank to this PalmPay account will automatically credit your wallet.'
    ]
  },
  {
    keywords: ['bvn', 'nin', 'kyc', 'verification', 'tier', 'limit', 'upgrade', 'cac'],
    title: 'KYC Verification & Account Limits',
    answer: 'VTStack operates a 3-tier KYC system compliant with CBN guidelines. Higher tiers unlock higher daily and monthly withdrawal limits.',
    relatedSlug: 'kyc-verification-tier1-to-tier3-guide',
    steps: [
      'Tier 1 (Basic): Verified with BVN/NIN upon registration. ₦100,000 daily deposit limit.',
      'Tier 2: Upload a Government ID (Passport, NIN slip, Driver License) and a selfie under Settings -> Verification. Increases limit to ₦500,000.',
      'Tier 3 (Enterprise): Upload utility bill and CAC business registration documents for up to ₦5,000,000 daily limits.'
    ]
  },
  {
    keywords: ['webhook', 'api', 'api key', 'integration', 'signature', 'developer', 'endpoint'],
    title: 'Developer API & Webhook Integration',
    answer: 'VTStack provides real-time webhooks for deposit and payout notifications. Webhooks are cryptographically signed using RSA-SHA1 with uppercase MD5 of sorted parameters for maximum security.',
    relatedSlug: 'developer-integration-api-keys-and-webhooks',
    steps: [
      'Navigate to Dashboard -> Developer -> API Keys to obtain your Live and Test keys.',
      'Enter your HTTPS Webhook URL under Developer -> Webhook Settings.',
      'Verify incoming signatures in the "Signature" header using PalmPay\'s public key.',
      'Always store the orderNo to prevent double-crediting (idempotency).'
    ]
  },
  {
    keywords: ['payout', 'withdraw', 'transfer', 'settlement', 'bank', 'pin'],
    title: 'Payouts, Withdrawals & Automated Settlements',
    answer: 'You can withdraw funds from your VTStack wallet to any commercial bank account in Nigeria instantly or set up automated daily settlements.',
    relatedSlug: 'how-to-request-and-automate-payouts-and-settlements',
    steps: [
      'Set your 4-digit Transaction PIN under Settings -> Security.',
      'Add your bank account under Payouts -> Saved Accounts (names are resolved via CBN NIBSS).',
      'Initiate single payouts or toggle on "Automated Daily Settlement" under Settings -> Settlements for T+1 automatic bank deposits.'
    ]
  },
  {
    keywords: ['security', '2fa', 'two-factor', 'pin', 'whitelist', 'ip'],
    title: 'Account Security & Two-Factor Authentication',
    answer: 'Protect your merchant wallet with two-factor authentication, secret transaction PINs, and IP whitelisting for automated API payouts.',
    relatedSlug: 'securing-your-vtstack-account-pin-2fa-and-ip-whitelist',
    steps: [
      'Enable 2FA using Google Authenticator under Settings -> Security.',
      'Never share your 4-digit transaction PIN with external parties.',
      'If using API payouts, whitelist your production server IP under Developer -> Security.'
    ]
  },
  {
    keywords: ['unknown exception', 'open_gw_000017', 'failed', 'error', 'palmpay error'],
    title: 'Troubleshooting PalmPay Gateway Errors',
    answer: 'The PalmPay error "unknow exception" (OPEN_GW_000017) occurs if the merchant portal has not completed the Virtual Account product activation under Pay-In -> Virtual Account, or if the BVN does not match the customer name.',
    relatedSlug: 'how-to-generate-real-palmpay-virtual-accounts',
    steps: [
      'Confirm your PalmPay Business account has approved Virtual Account product permissions.',
      'Ensure the legal name entered matches the NIBSS record of the provided BVN.',
      'Check that your 11-digit BVN contains only numbers with no dashes or spaces.'
    ]
  }
];

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json().catch(() => ({}));
    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Please provide a question or search query.'
      }, { status: 400 });
    }

    const cleanQuery = query.toLowerCase().trim();

    // Match against knowledge items
    let bestMatch: KnowledgeItem | null = null;
    let highestScore = 0;

    for (const item of KNOWLEDGE_BASE) {
      let score = 0;
      for (const kw of item.keywords) {
        if (cleanQuery.includes(kw)) {
          score += 3;
        }
      }
      const titleWords = item.title.toLowerCase().split(/\s+/);
      for (const word of titleWords) {
        if (word.length > 3 && cleanQuery.includes(word)) {
          score += 2;
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    // Also search blog posts
    const matchingPost = BLOG_POSTS.find(post => 
      post.title.toLowerCase().includes(cleanQuery) ||
      post.tags.some(t => cleanQuery.includes(t.toLowerCase())) ||
      post.excerpt.toLowerCase().includes(cleanQuery)
    );

    if (bestMatch && highestScore > 0) {
      return NextResponse.json({
        success: true,
        data: {
          title: bestMatch.title,
          answer: bestMatch.answer,
          steps: bestMatch.steps || [],
          relatedArticle: bestMatch.relatedSlug ? {
            slug: bestMatch.relatedSlug,
            url: `/blog/${bestMatch.relatedSlug}`
          } : null
        }
      });
    }

    if (matchingPost) {
      return NextResponse.json({
        success: true,
        data: {
          title: matchingPost.title,
          answer: matchingPost.excerpt,
          steps: [
            `Read the complete step-by-step tutorial: "${matchingPost.title}"`,
            'Follow the verified instructions and copy tested integration examples.'
          ],
          relatedArticle: {
            slug: matchingPost.slug,
            url: `/blog/${matchingPost.slug}`
          }
        }
      });
    }

    // General fallback response
    return NextResponse.json({
      success: true,
      data: {
        title: 'VTStack Guide Assistant',
        answer: `Here is helpful guidance for your query: "${query}". You can create PalmPay virtual accounts with your BVN, accept instant deposits, automate payouts, and connect via our developer APIs.`,
        steps: [
          'To generate a Virtual Account: Go to Dashboard -> Virtual Accounts -> Create Virtual Account.',
          'To verify identity: Go to Settings -> Verification & KYC.',
          'For API documentation and Webhooks: Visit /api-docs or our Developer portal.'
        ],
        relatedArticle: {
          slug: 'how-to-generate-real-palmpay-virtual-accounts',
          url: '/blog/how-to-generate-real-palmpay-virtual-accounts'
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to process AI query'
    }, { status: 500 });
  }
}
