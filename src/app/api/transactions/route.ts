import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'credit' | 'debit'
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '15', 10)));

    let transactions = await db.transactions.findByUserId(user.id);

    // Filter by type (credit / debit)
    if (type) {
      transactions = transactions.filter(t => t.type?.toLowerCase() === type.toLowerCase());
    }

    // Filter by search query (reference, narration, customerReference, externalRef)
    if (search) {
      transactions = transactions.filter(t =>
        (t.reference && t.reference.toLowerCase().includes(search)) ||
        (t.narration && t.narration.toLowerCase().includes(search)) ||
        (t.customerReference && t.customerReference.toLowerCase().includes(search)) ||
        (t.externalRef && t.externalRef.toLowerCase().includes(search))
      );
    }

    // Filter by start date
    if (startDate) {
      const start = new Date(startDate).getTime();
      transactions = transactions.filter(t => new Date(t.createdAt).getTime() >= start);
    }

    // Filter by end date
    if (endDate) {
      const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1);
      transactions = transactions.filter(t => new Date(t.createdAt).getTime() <= end);
    }

    const total = transactions.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = transactions.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: {
        transactions: paginated,
        total,
        page,
        limit,
        totalPages,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    console.error('[API /transactions error]:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch transactions' }, { status: 500 });
  }
}
