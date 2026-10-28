import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  await db.users.update(user.id, { ...body, kycLevel: 2, kyc_tier: 't2', kyc_status: 'pending' });
  return NextResponse.json({ success: true, message: 'Tier 2 KYC submitted' });
}
