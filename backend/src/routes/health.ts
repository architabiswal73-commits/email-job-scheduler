import { Router } from 'express';
import { db } from '../db/client';
import { redis } from '../queues/connection';

export const healthRouter = Router();

async function within<T>(task: Promise<T>, timeoutMs: number) {
  return Promise.race([
    task,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('health check timed out')), timeoutMs);
    })
  ]);
}

healthRouter.get('/health', async (_req, res) => {
  const checks = await Promise.allSettled([
    within(db.$queryRaw`SELECT 1`, 1000),
    within(redis.ping(), 1000)
  ]);
  const postgres = checks[0].status === 'fulfilled';
  const redisOk = checks[1].status === 'fulfilled';
  const healthy = postgres && redisOk;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    postgres: postgres ? 'ok' : 'unavailable',
    redis: redisOk ? 'ok' : 'unavailable'
  });
});
