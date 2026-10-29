import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  // 1. User's sent help tickets
  const helpMsgs = await db.help.findByUserId(user.id);
  const formattedHelp = (helpMsgs || []).map((m: any) => ({
    _id: m.id || m._id,
    id: m.id || m._id,
    subject: m.subject,
    message: m.message,
    status: m.status || 'pending',
    direction: 'sent',
    sender: 'You',
    adminReply: m.adminNotes || m.admin_notes || undefined,
    createdAt: m.createdAt || m.created_at || new Date().toISOString(),
  }));

  // 2. Communications sent to this user by admin
  const comms = await db.communications.findByUserId(user.id);
  const formattedComms = (comms || []).map((c: any) => ({
    _id: c.id || c._id,
    id: c.id || c._id,
    subject: c.subject,
    message: c.message,
    status: 'resolved',
    direction: 'received',
    sender: 'VTStack Support',
    createdAt: c.createdAt || c.created_at || new Date().toISOString(),
  }));

  // Combine and sort by date descending
  const allMessages = [...formattedHelp, ...formattedComms].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ success: true, data: allMessages });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const msg = await db.help.create({
    userId: user.id,
    email: user.email,
    subject: body.subject,
    message: body.message,
    status: 'pending',
  });
  return NextResponse.json({ success: true, message: 'Support ticket submitted', data: msg });
}
