import { NextRequest } from 'next/server';
import { verifyToken, extractBearerToken, TokenPayload } from './jwt';
import db, { DbUser } from '../db';

export async function getAuthenticatedUser(req: NextRequest): Promise<DbUser | null> {
  // 1. Check for API key in custom headers
  const apiKeyHeader = req.headers.get('x-api-key') || req.headers.get('api-key');
  if (apiKeyHeader) {
    const user = await db.users.findByApiKey(apiKeyHeader);
    if (user) return user;
  }

  // 2. Check Authorization header
  const authHeader = req.headers.get('authorization');
  const token = extractBearerToken(authHeader);
  if (!token) return null;

  // 2a. If token is an API key prefix (e.g., vtp_live_, vtp_test_, sk_live_)
  if (token.startsWith('vtp_') || token.startsWith('sk_')) {
    const user = await db.users.findByApiKey(token);
    if (user) return user;
  }

  // 2b. Otherwise verify as JWT token
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
