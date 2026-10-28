import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bankCode = searchParams.get('bankCode');
  const accountNumber = searchParams.get('accountNumber');

  if (!bankCode || !accountNumber) {
    return NextResponse.json({ success: false, message: 'bankCode and accountNumber are required' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data: {
      accountNumber,
      accountName: 'VTSTACK VERIFIED MERCHANT',
      bankCode,
    },
  });
}
