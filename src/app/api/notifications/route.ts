import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch user notifications from DB
    let notifications = await db.notifications.findByUserId(user.id);

    // 2. Ensure Welcome notification exists for user
    const hasWelcome = notifications.some((n: any) => n.title && n.title.includes('Welcome to VTStack'));
    if (!hasWelcome) {
      const welcome = await db.notifications.create({
        userId: user.id,
        title: 'Welcome to VTStack! 🚀',
        message: `Hi ${user.firstName || 'there'}, your VTStack account is ready. Generate API keys, set up virtual accounts, and configure automated payouts.`,
        type: 'system',
        link: '/app',
        createdAt: user.createdAt || new Date().toISOString(),
      });
      notifications.unshift(welcome);
    }

    // 3. Ensure KYC status notification exists if verified or rejected
    if (user.kyc_status === 'verified') {
      const hasKycNotif = notifications.some((n: any) => n.type === 'kyc' && n.title.includes('Verified'));
      if (!hasKycNotif) {
        const kycNotif = await db.notifications.create({
          userId: user.id,
          title: `KYC Tier ${user.kycLevel || 1} Verified ✅`,
          message: 'Your identity documents have been reviewed and approved by compliance.',
          type: 'kyc',
          link: '/app/verification',
          createdAt: user.updatedAt || new Date().toISOString(),
        });
        notifications.unshift(kycNotif);
      }
    }

    // 4. Ensure Payout activation notification if payout is enabled
    if (user.isPayoutEnabled) {
      const hasPayoutNotif = notifications.some((n: any) => n.type === 'payout');
      if (!hasPayoutNotif) {
        const payoutNotif = await db.notifications.create({
          userId: user.id,
          title: 'Payout Access Granted 💳',
          message: 'Automated bank payouts are now unlocked on your merchant account.',
          type: 'payout',
          link: '/app/payout',
          createdAt: user.updatedAt || new Date().toISOString(),
        });
        notifications.unshift(payoutNotif);
      }
    }

    // 5. Sync any communications sent from admin to this user
    try {
      const comms = await db.communications.findByUserId(user.id);
      for (const comm of comms) {
        const alreadyIn = notifications.some((n: any) => n.id === comm.id || n.id === comm._id || (n.title === comm.subject && n.type === 'announcement'));
        if (!alreadyIn && comm.subject) {
          notifications.push({
            id: comm.id || comm._id,
            _id: comm.id || comm._id,
            userId: user.id,
            title: comm.subject,
            message: comm.message,
            type: 'announcement',
            isRead: false,
            read: false,
            link: '/app/help',
            createdAt: comm.createdAt,
          });
        }
      }
    } catch (e) {
      // silent
    }

    // 6. Sync recent transactions
    try {
      const txs = await db.transactions.findByUserId(user.id);
      const recentTxs = txs.slice(0, 5);
      for (const tx of recentTxs) {
        const txNotifId = `tx-${tx.id || tx.reference}`;
        const alreadyIn = notifications.some((n: any) => n.id === txNotifId || n._id === txNotifId);
        if (!alreadyIn) {
          const isCredit = tx.type === 'credit';
          const title = isCredit 
            ? `Payment Received: +₦${Number(tx.amount || 0).toLocaleString()}` 
            : `Transfer Debited: -₦${Number(tx.amount || 0).toLocaleString()}`;
          const message = tx.narration || `Ref: ${tx.reference || 'N/A'} - Status: ${tx.status || 'success'}`;
          
          notifications.push({
            id: txNotifId,
            _id: txNotifId,
            userId: user.id,
            title,
            message,
            type: 'transaction',
            isRead: true, // Existing transactions default to read unless unread
            read: true,
            link: '/app/transactions',
            createdAt: tx.createdAt,
          });
        }
      }
    } catch (e) {
      // silent
    }

    // Sort by createdAt descending
    notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate unread count
    const unreadCount = notifications.filter((n: any) => !n.isRead && !n.read).length;

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Failed to get notifications:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, id } = body;

    if (action === 'read_all' || action === 'mark_all_read') {
      await db.notifications.markAllAsRead(user.id);
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (id) {
      await db.notifications.markAsRead(id, user.id);
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
