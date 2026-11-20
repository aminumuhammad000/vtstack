import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      state,
      lga,
      address,
      bvn,
      nin,
      idNumber,
      identityType,
      idCard,
      selfie,
      utilityBill,
      idCardPath,
      selfiePath,
      utilityBillPath,
    } = body;

    const updatedUser = await db.users.update(user.id, {
      state: state || user.state,
      lga: lga || user.lga,
      address: address || user.address,
      bvn: bvn || user.bvn,
      nin: nin || idNumber || user.nin,
      identityType: identityType || user.identityType,
      idCardPath: idCard || idCardPath || user.idCardPath,
      selfiePath: selfie || selfiePath || user.selfiePath,
      utilityBillPath: utilityBill || utilityBillPath || user.utilityBillPath,
      kyc_status: 'pending',
      kyc_tier: 't2',
    });

    return NextResponse.json({
      success: true,
      message: 'KYC documents submitted successfully and are under review',
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('KYC submission error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to submit KYC' }, { status: 500 });
  }
}
