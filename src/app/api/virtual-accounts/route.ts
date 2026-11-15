import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import palmpayService from '@/lib/palmpay/service';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const accounts = await db.virtualAccounts.findByUserId(user.id);
    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch virtual accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // Customer name & email
    const customerName = (body.customerName || body.accountName || user.fullName || user.businessName || `${user.firstName || ''} ${user.lastName || ''}`).trim();
    const email = body.email || user.email;

    // License number (BVN or NIN or CAC)
    const bvn = (body.bvn || body.licenseNumber || user.bvn || '').trim();
    const nin = (body.nin || user.nin || '').trim();
    const cacNumber = (body.cacNumber || user.rcNumber || '').trim();

    const licenseNumber = bvn || nin || cacNumber;

    if (!licenseNumber) {
      return NextResponse.json({
        success: false,
        message: 'A valid 11-digit BVN or national identity number is required by PalmPay to generate a real virtual account.'
      }, { status: 400 });
    }

    if (bvn && bvn.length !== 11) {
      return NextResponse.json({
        success: false,
        message: 'BVN must be exactly 11 digits.'
      }, { status: 400 });
    }

    const identityType = body.identityType || (cacNumber ? 'company' : nin && !bvn ? 'personal_nin' : 'personal');
    const accountReference = `VA-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Call PalmPay real Virtual Account API - NEVER generate fake numbers
    console.log(`[VirtualAccounts] Requesting real virtual account from PalmPay for user ${user.id} (${customerName})`);
    
    let palmpayResult;
    try {
      palmpayResult = await palmpayService.createVirtualAccount({
        accountName: customerName,
        customerName: customerName,
        email: email,
        bvn: bvn || undefined,
        nin: nin || undefined,
        cacNumber: cacNumber || undefined,
        identityType: identityType,
        accountReference: accountReference,
      });
    } catch (palmPayErr: any) {
      console.error('[VirtualAccounts] PalmPay real account creation failed:', palmPayErr.message);
      return NextResponse.json({
        success: false,
        message: palmPayErr.message || 'Failed to create real virtual account via PalmPay. Please check your BVN/details.'
      }, { status: 400 });
    }

    // Persist real PalmPay virtual account
    const newAccount = await db.virtualAccounts.create({
      userId: user.id,
      accountNumber: palmpayResult.virtualAccountNo,
      accountName: palmpayResult.virtualAccountName,
      bankName: palmpayResult.bankName || 'PalmPay',
      bankType: 'palmpay',
      email: email,
      alias: body.alias || 'PalmPay Collection Account',
      reference: palmpayResult.accountReference,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      message: 'Real PalmPay virtual account created successfully. You can now transfer funds to this account.',
      data: newAccount,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[VirtualAccounts] Exception:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to process virtual account generation'
    }, { status: 500 });
  }
}
