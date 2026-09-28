import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ELASTICSEARCH_URL: z.string().url(),
  ELASTICSEARCH_ENABLED: z.enum(['true', 'false']).default('true'),
  PORT: z.coerce.number().int().positive(),
  FRONTEND_URL: z.string().url(),
  SESSION_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  SLACK_CLIENT_ID: z.string().min(1),
  SLACK_CLIENT_SECRET: z.string().min(1),
  SLACK_REDIRECT_URI: z.string().url(),
  WORKER_CONCURRENCY: z.coerce.number().int().positive(),
  MIN_DELAY_BETWEEN_EMAILS_MS: z.coerce.number().int().nonnegative(),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().int().positive()
});

const result = schema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Invalid environment configuration: ${missing}`);
}

export const config = {
  databaseUrl: result.data.DATABASE_URL,
  redisUrl: result.data.REDIS_URL,
  elasticsearchUrl: result.data.ELASTICSEARCH_URL,
  port: result.data.PORT,
  frontendUrl: result.data.FRONTEND_URL,
  sessionSecret: result.data.SESSION_SECRET,
  googleClientId: result.data.GOOGLE_CLIENT_ID,
  googleClientSecret: result.data.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: result.data.GOOGLE_REDIRECT_URI,
  slackClientId: result.data.SLACK_CLIENT_ID,
  slackClientSecret: result.data.SLACK_CLIENT_SECRET,
  slackRedirectUri: result.data.SLACK_REDIRECT_URI,
  workerConcurrency: result.data.WORKER_CONCURRENCY,
  minDelayBetweenEmailsMs: result.data.MIN_DELAY_BETWEEN_EMAILS_MS,
  maxEmailsPerHourPerSender: result.data.MAX_EMAILS_PER_HOUR_PER_SENDER
  ,elasticsearchEnabled: result.data.ELASTICSEARCH_ENABLED === 'true',
  googleConfigured: !result.data.GOOGLE_CLIENT_ID.startsWith('__FILL_') && !result.data.GOOGLE_CLIENT_SECRET.startsWith('__FILL_'),
  slackConfigured: !result.data.SLACK_CLIENT_ID.startsWith('__FILL_') && !result.data.SLACK_CLIENT_SECRET.startsWith('__FILL_')
} as const;
