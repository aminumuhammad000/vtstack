import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const tenants = await db.users.findTenants();
    const admins = await db.users.findAdmins();
    const virtualAccounts = await db.virtualAccounts.findAll();
    const transactions = await db.transactions.findAll();
    const webhooks = await db.webhooks.findAll();

    let dailyInflow = 0;
    let dailyOutflow = 0;
    let monthlyInflow = 0;
    let monthlyOutflow = 0;
    let yearlyInflow = 0;
    let yearlyOutflow = 0;
    let dailyFee = 0;
    let monthlyFee = 0;
    let yearlyFee = 0;

    let successCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    const quarters = {
      q1: { inflow: 0, outflow: 0 },
      q2: { inflow: 0, outflow: 0 },
      q3: { inflow: 0, outflow: 0 },
      q4: { inflow: 0, outflow: 0 },
    };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    transactions.forEach(t => {
      const d = new Date(t.createdAt);
      const tTime = d.getTime();
      const amount = Number(t.amount) || 0;
      const fee = Number(t.fee) || 0;

      if (t.status === 'success') successCount++;
      else if (t.status === 'pending') pendingCount++;
      else failedCount++;

      if (d.getFullYear() === currentYear) {
        const month = d.getMonth();
        if (month < 3) {
          if (t.type === 'credit') quarters.q1.inflow += amount;
          else quarters.q1.outflow += amount;
        } else if (month < 6) {
          if (t.type === 'credit') quarters.q2.inflow += amount;
          else quarters.q2.outflow += amount;
        } else if (month < 9) {
          if (t.type === 'credit') quarters.q3.inflow += amount;
          else quarters.q3.outflow += amount;
        } else {
          if (t.type === 'credit') quarters.q4.inflow += amount;
          else quarters.q4.outflow += amount;
        }

        if (t.type === 'credit' && t.status === 'success') {
          yearlyInflow += amount;
        } else if (t.type === 'debit') {
          yearlyOutflow += amount;
        }
        yearlyFee += fee;

        if (month === currentMonth) {
          if (t.type === 'credit' && t.status === 'success') monthlyInflow += amount;
          else if (t.type === 'debit') monthlyOutflow += amount;
          monthlyFee += fee;
        }

        if (tTime >= startOfToday) {
          if (t.type === 'credit' && t.status === 'success') dailyInflow += amount;
          else if (t.type === 'debit') dailyOutflow += amount;
          dailyFee += fee;
        }
      }
    });

    const activeTenants = tenants.filter(t => t.status === 'active').length;
    const suspendedTenants = tenants.filter(t => t.status === 'suspended').length;
    const pendingTenants = tenants.filter(t => t.status === 'pending' || t.status === 'inactive').length;

    const recentTransactions = transactions.slice(0, 10).map(t => ({
      ...t,
      _id: t.id,
    }));

    return NextResponse.json({
      success: true,
      data: {
        transactions: {
          dailyInflow,
          dailyOutflow,
          monthlyInflow,
          monthlyOutflow,
          yearlyInflow,
          yearlyOutflow,
          dailyFee,
          monthlyFee,
          yearlyFee,
          quarters,
          successCount,
          pendingCount,
          failedCount,
        },
        tenants: {
          total: tenants.length,
          active: activeTenants,
          suspended: suspendedTenants,
          pending: pendingTenants,
          admins: admins.length,
          virtualAccounts: virtualAccounts.length,
        },
        webhooks: {
          total: webhooks.length,
          success: webhooks.filter(w => w.status === 'success' || w.status === 'SUCCESS').length,
          failed: webhooks.filter(w => w.status === 'failed' || w.status === 'FAILED').length,
          pending: webhooks.filter(w => w.status === 'pending' || w.status === 'PENDING').length,
        },
        recentTransactions,
      },
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ success: false, message: 'Failed to get statistics' }, { status: 500 });
  }
}
