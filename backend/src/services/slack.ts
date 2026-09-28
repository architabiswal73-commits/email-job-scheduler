import { db } from '../db/client';
import { config } from '../config/env';

export function slackAuthorizeUrl(state: string) {
  if (!config.slackConfigured) throw new Error('Slack OAuth is not configured. Fill SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in backend/.env.');
  const params = new URLSearchParams({
    client_id: config.slackClientId,
    scope: 'incoming-webhook',
    redirect_uri: config.slackRedirectUri,
    state
  });
  return `https://slack.com/oauth/v2/authorize?${params}`;
}

export async function exchangeSlackCode(code: string) {
  if (!config.slackConfigured) throw new Error('Slack OAuth is not configured.');
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.slackClientId,
      client_secret: config.slackClientSecret,
      code,
      redirect_uri: config.slackRedirectUri
    })
  });
  const data = await response.json() as { ok: boolean; incoming_webhook?: { url?: string }; error?: string };
  if (!response.ok || !data.ok || !data.incoming_webhook?.url) throw new Error(data.error ?? 'Slack authorization failed');
  return data.incoming_webhook.url;
}

export async function notifySlack(userId: string, message: string) {
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { slackWebhookUrl: true } });
    if (!user?.slackWebhookUrl) return;

    const response = await fetch(user.slackWebhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: message })
    });
    if (!response.ok) console.error(`Slack notification failed with ${response.status}`);
  } catch (error) {
    console.error('Slack notification failed', error);
  }
}
