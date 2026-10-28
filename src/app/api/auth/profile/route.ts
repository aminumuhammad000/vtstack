import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        _id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        phone: user.phone,
        businessName: user.businessName,
        kycLevel: user.kycLevel,
        kyc_status: user.kyc_status,
        kyc_tier: user.kyc_tier,
        isPayoutEnabled: user.isPayoutEnabled,
        payoutRequestStatus: user.payoutRequestStatus,
        status: user.status,
        role: user.role,
        webhookActive: user.webhookActive,
        webhookUrl: user.webhookUrl,
        profilePicture: user.profilePicture,
        transactionPinSet: user.transactionPinSet,
        state: user.state,
        lga: user.lga,
        address: user.address,
        bvn: user.bvn,
        nin: user.nin,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error retrieving profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const updates = await req.json();
    const updated = await db.users.update(user.id, updates);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error updating profile' }, { status: 500 });
  }
}
