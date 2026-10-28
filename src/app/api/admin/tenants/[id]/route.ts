import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const user = await db.users.findById(id);
    if (!user) return NextResponse.json({ success: false, message: 'Tenant not found' }, { status: 404 });

    const wallet = await db.wallets.findByUserId(id);
    const virtualAccounts = await db.virtualAccounts.findByUserId(id);
    const transactions = await db.transactions.findByUserId(id);

    const totalTransactionAmount = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: user.id,
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          businessName: user.businessName,
          phone: user.phone,
          nin: user.nin,
          bvn: user.bvn,
          idCardPath: user.idCardPath,
          selfiePath: user.selfiePath,
          utilityBillPath: user.utilityBillPath,
          cacDocumentPath: user.cacDocumentPath,
          kycLevel: user.kycLevel,
          kyc_status: user.kyc_status,
          kyc_tier: user.kyc_tier,
          status: user.status,
          state: user.state,
          lga: user.lga,
          webhookUrl: user.webhookUrl,
          isPayoutEnabled: user.isPayoutEnabled,
          settlementEnabled: user.settlementEnabled,
          payoutRequestStatus: user.payoutRequestStatus,
          payoutRequestReason: user.payoutRequestReason,
          payoutIpWhitelist: user.payoutIpWhitelist,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        wallet: wallet ? {
          _id: wallet.id,
          userId: wallet.userId,
          balance: wallet.balance,
          clearedBalance: wallet.clearedBalance,
          lockedBalance: wallet.lockedBalance,
          currency: wallet.currency,
        } : null,
        stats: {
          totalTransactionAmount,
          totalTransactionCount: transactions.length,
        },
        virtualAccounts: virtualAccounts.map(va => ({
          ...va,
          _id: va.id,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch tenant' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await db.users.delete(id);
    return NextResponse.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to delete tenant' }, { status: 500 });
  }
}
