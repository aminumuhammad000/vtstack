import { NextRequest } from 'next/server';
import { verifyToken, extractBearerToken, TokenPayload } from './jwt';
import db, { DbUser } from '../db';

export async function getAuthenticatedUser(req: NextRequest): Promise<DbUser | null> {
  const authHeader = req.headers.get('authorization');
  const token = extractBearerToken(authHeader);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  return db.users.findById(payload.userId);
}

export async function requireAdmin(req: NextRequest): Promise<DbUser | null> {
  const user = await getAuthenticatedUser(req);
  if (!user || (user.role !== 'admin' && user.role !== 'subadmin')) {
    return null;
  }
  return user;
}
