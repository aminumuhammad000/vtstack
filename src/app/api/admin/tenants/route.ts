import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const tenants = await db.users.findTenants();
    const formatted = tenants.map(t => ({
      _id: t.id,
      id: t.id,
      email: t.email,
      firstName: t.firstName,
      lastName: t.lastName,
      businessName: t.businessName,
      phone: t.phone,
      nin: t.nin,
      bvn: t.bvn,
      idCardPath: t.idCardPath,
      selfiePath: t.selfiePath,
      utilityBillPath: t.utilityBillPath,
      cacDocumentPath: t.cacDocumentPath,
      kycLevel: t.kycLevel,
      kyc_status: t.kyc_status,
      kyc_tier: t.kyc_tier,
      status: t.status,
      state: t.state,
      lga: t.lga,
      webhookUrl: t.webhookUrl,
      isPayoutEnabled: t.isPayoutEnabled,
      settlementEnabled: t.settlementEnabled,
      payoutRequestStatus: t.payoutRequestStatus,
      payoutRequestReason: t.payoutRequestReason,
      payoutIpWhitelist: t.payoutIpWhitelist,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch tenants' }, { status: 500 });
  }
}
