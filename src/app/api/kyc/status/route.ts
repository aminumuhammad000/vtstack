import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    success: true,
    data: {
      kycLevel: user.kycLevel,
      kyc_status: user.kyc_status,
      kyc_tier: user.kyc_tier,
      isPayoutEnabled: user.isPayoutEnabled,
    },
  });
}
