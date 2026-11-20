import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      businessName,
      businessAddress,
      businessPhone,
      rcNumber,
      cacDocument,
      cacDocumentPath,
      utilityBill,
      utilityBillPath,
    } = body;

    const updatedUser = await db.users.update(user.id, {
      businessName: businessName || user.businessName,
      businessAddress: businessAddress || user.businessAddress,
      businessPhone: businessPhone || user.businessPhone,
      rcNumber: rcNumber || user.rcNumber,
      cacDocumentPath: cacDocument || cacDocumentPath || user.cacDocumentPath,
      utilityBillPath: utilityBill || utilityBillPath || user.utilityBillPath,
      payoutRequestStatus: 'pending',
      kyc_tier: 't3',
    });

    return NextResponse.json({
      success: true,
      message: 'Business upgrade submitted successfully and is under review',
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('Business upgrade submission error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to submit business upgrade' }, { status: 500 });
  }
}
