import { Router } from 'express';
import { EmailStatus } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db/client';
import { scheduleEmails, validateScheduleLimits } from '../services/emailScheduler';
import { searchEmails } from '../services/emailSearch';
import { requireAuth } from '../middleware/auth';

const scheduleSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1),
  startTime: z.string().datetime({ offset: true }),
  delayBetweenMs: z.number().int().nonnegative(),
  hourlyLimit: z.number().int().positive()
});

const listSchema = z.object({
  status: z.enum(['scheduled', 'sent']).default('scheduled'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(20)
});

export const emailsRouter = Router();

emailsRouter.post('/api/emails/schedule', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.userId as string;
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const limitError = validateScheduleLimits(parsed.data.delayBetweenMs, parsed.data.hourlyLimit);
    if (limitError) {
      res.status(400).json({ error: limitError });
      return;
    }

    const result = await scheduleEmails(userId, {
      ...parsed.data,
      startTime: new Date(parsed.data.startTime)
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

emailsRouter.get('/api/emails', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.userId as string;
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { status, page, pageSize } = parsed.data;
    const where = {
      userId,
      status: status === 'scheduled'
        ? EmailStatus.scheduled
        : { in: [EmailStatus.sent, EmailStatus.failed] }
    };
    const [emails, total] = await db.$transaction([
      db.email.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      db.email.count({ where })
    ]);

    res.json({ emails, page, pageSize, total });
  } catch (error) {
    next(error);
  }
});

emailsRouter.get('/api/emails/search', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.userId as string;
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ emails: await searchEmails(userId, query, status) });
  } catch (error) {
    next(error);
  }
});
