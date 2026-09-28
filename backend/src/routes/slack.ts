import { Router } from 'express';
import { db } from '../db/client';
import { oauthState, requireAuth, verifyOauthState } from '../middleware/auth';
import { config } from '../config/env';
import { exchangeSlackCode, slackAuthorizeUrl } from '../services/slack';

const router = Router();

router.get('/slack/connect', requireAuth, (_req, res) => {
  res.redirect(slackAuthorizeUrl(oauthState({ provider: 'slack', userId: res.locals.userId })));
});

router.get('/slack/callback', async (req, res, next) => {
  try {
    const state = verifyOauthState(typeof req.query.state === 'string' ? req.query.state : undefined, 'slack');
    const code = typeof req.query.code === 'string' ? req.query.code : null;
    if (!state?.userId || !code) {
      res.status(400).json({ error: 'Invalid Slack OAuth response' });
      return;
    }
    const webhookUrl = await exchangeSlackCode(code);
    await db.user.update({ where: { id: state.userId }, data: { slackWebhookUrl: webhookUrl } });
    res.redirect(`${config.frontendUrl}/dashboard`);
  } catch (error) {
    next(error);
  }
});

router.get('/slack/status', requireAuth, async (_req, res, next) => {
  try {
    const user = await db.user.findUnique({ where: { id: res.locals.userId }, select: { slackWebhookUrl: true } });
    res.json({ connected: Boolean(user?.slackWebhookUrl) });
  } catch (error) {
    next(error);
  }
});

router.delete('/slack/disconnect', requireAuth, async (_req, res, next) => {
  try {
    await db.user.update({ where: { id: res.locals.userId }, data: { slackWebhookUrl: null } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export { router as slackRouter };
