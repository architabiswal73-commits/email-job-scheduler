import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { config } from '../config/env';

function getCookie(header: string | undefined) {
  return header?.split(';').map((part) => part.trim()).find((part) => part.startsWith('session='))?.slice(8);
}

export function sessionToken(userId: string) {
  return jwt.sign({ userId }, config.sessionSecret, { expiresIn: '7d' });
}

export function authCookie(token: string) {
  return `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

export function clearAuthCookie() {
  return 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

export function userIdFromSession(header: string | undefined) {
  const token = getCookie(header);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.sessionSecret);
    return typeof payload === 'object' && typeof payload.userId === 'string' ? payload.userId : null;
  } catch {
    return null;
  }
}

export function oauthState(value: { provider: 'google' | 'slack'; userId?: string }) {
  return jwt.sign(value, config.sessionSecret, { expiresIn: '10m' });
}

export function verifyOauthState(token: string | undefined, provider: 'google' | 'slack') {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.sessionSecret);
    return typeof payload === 'object' && payload.provider === provider ? payload : null;
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const userId = userIdFromSession(req.headers.cookie);
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  res.locals.userId = userId;
  next();
};