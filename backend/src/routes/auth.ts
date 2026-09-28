import { Router } from 'express';
import { db } from '../db/client';
import { authCookie, clearAuthCookie, oauthState, requireAuth, sessionToken, verifyOauthState } from '../middleware/auth';
import { config } from '../config/env';

const router = Router();

router.get('/auth/google', (_req, res) => {
  if (!config.googleConfigured) {
    res.status(503).json({ error: 'Google OAuth is not configured. Fill GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.' });
    return;
  }
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: oauthState({ provider: 'google' })
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/auth/google/callback', async (req, res, next) => {
  try {
    if (!config.googleConfigured) {
      res.status(503).json({ error: 'Google OAuth is not configured.' });
      return;
    }
    if (!verifyOauthState(typeof req.query.state === 'string' ? req.query.state : undefined, 'google')) {
      res.status(400).json({ error: 'Invalid OAuth state' });
      return;
    }
    const code = typeof req.query.code === 'string' ? req.query.code : null;
    if (!code) {
      res.status(400).json({ error: 'Missing OAuth code' });
      return;
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: config.googleClientId, client_secret: config.googleClientSecret, redirect_uri: config.googleRedirectUri, grant_type: 'authorization_code' })
    });
    const tokens = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !tokens.access_token) throw new Error('Google token exchange failed');

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${tokens.access_token}` } });
    const profile = await profileResponse.json() as { sub?: string; email?: string; name?: string; picture?: string };
    if (!profileResponse.ok || !profile.sub || !profile.email) throw new Error('Google profile lookup failed');

    const user = await db.user.upsert({
      where: { googleId: profile.sub },
      update: { email: profile.email, name: profile.name ?? profile.email, avatar: profile.picture ?? '' },
      create: { googleId: profile.sub, email: profile.email, name: profile.name ?? profile.email, avatar: profile.picture ?? '' }
    });
    res.setHeader('Set-Cookie', authCookie(sessionToken(user.id)));
    res.redirect(`${config.frontendUrl}/dashboard`);
  } catch (error) {
    next(error);
  }
});

router.get('/auth/me', requireAuth, async (_req, res, next) => {
  try {
    const user = await db.user.findUnique({ where: { id: res.locals.userId }, select: { name: true, email: true, avatar: true } });
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post('/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', clearAuthCookie());
  res.status(204).end();
});

export { router as authRouter };
