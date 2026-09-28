import nodemailer from 'nodemailer';
import type { Job } from 'bullmq';
import { DelayedError, Worker } from 'bullmq';
import { config } from '../config/env';
import { db } from '../db/client';
import { redis } from '../queues/connection';
import type { EmailJob } from '../queues/emailQueue';
import { updateEmailSchedule, updateEmailStatus } from '../services/emailSearch';
import { notifySlack } from '../services/slack';

export async function recoverProcessingEmails() {
  await db.email.updateMany({
    where: { status: 'processing' },
    data: { status: 'scheduled' }
  });
}

async function sendEmail(job: Job<EmailJob>) {
  const claimed = await db.email.updateMany({
    where: { id: job.data.emailId, status: 'scheduled' },
    data: { status: 'processing' }
  });

  if (claimed.count === 0) {
    return;
  }

  const email = await db.email.findUnique({
    where: { id: job.data.emailId },
    include: { sender: true }
  });

  if (!email) {
    await db.email.updateMany({
      where: { id: job.data.emailId, status: 'processing' },
      data: { status: 'failed', error: 'Email row was not found' }
    });
    return;
  }

  const hour = new Date();
  hour.setUTCMinutes(0, 0, 0);
  const nextHour = new Date(hour.getTime() + 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  const window = `${hour.getUTCFullYear()}${pad(hour.getUTCMonth() + 1)}${pad(hour.getUTCDate())}${pad(hour.getUTCHours())}`;
  const limit = Math.min(job.data.hourlyLimit, config.maxEmailsPerHourPerSender);
  const count = await redis.eval(
    `local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count`,
    1,
    `rl:${email.senderId}:${window}`,
    Math.ceil((nextHour.getTime() - Date.now()) / 1000) + 60
  ) as number;

  if (count > limit) {
    const offset = Math.min(job.data.order * 1000 + (job.data.originalScheduledAt % 1000), 59 * 1000);
    const scheduledAt = new Date(nextHour.getTime() + offset);

    await db.email.updateMany({
      where: { id: email.id, status: 'processing' },
      data: { status: 'scheduled', scheduledAt }
    });
    try {
      await updateEmailSchedule(email.id, scheduledAt);
    } catch (error) {
      console.error(`Could not update search schedule for ${email.id}`, error);
    }

    await job.moveToDelayed(scheduledAt.getTime(), job.token);

    const noticeKey = `rl-notified:${email.senderId}:${window}`;
    const shouldNotify = await redis.set(noticeKey, '1', 'EX', 3600, 'NX');
    if (shouldNotify === 'OK') {
      await notifySlack(email.userId, `Hourly email limit reached for sender ${email.sender.email}`);
    }

    throw new DelayedError();
  }

  try {
    const transporter = nodemailer.createTransport({
      host: email.sender.smtpHost,
      port: email.sender.smtpPort,
      secure: email.sender.smtpPort === 465,
      auth: {
        user: email.sender.smtpUser,
        pass: email.sender.smtpPass
      }
    });

    await transporter.sendMail({
      messageId: `<${email.id}@email-job-scheduler>`,
      from: email.sender.email,
      to: email.toEmail,
      subject: email.subject,
      text: email.body
    });

    const sentAt = new Date();
    await db.email.updateMany({
      where: { id: email.id, status: 'processing' },
      data: { status: 'sent', sentAt }
    });
    try {
      await updateEmailStatus(email.id, 'sent', sentAt);
    } catch (error) {
      console.error(`Could not update search document for ${email.id}`, error);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isFinalAttempt = job.attemptsMade + 1 >= 3;

    await db.email.updateMany({
      where: { id: email.id, status: 'processing' },
      data: isFinalAttempt ? { status: 'failed', error: message } : { status: 'scheduled', error: message }
    });

    if (isFinalAttempt) {
      try {
        await updateEmailStatus(email.id, 'failed', null, message);
      } catch (error) {
        console.error(`Could not update search document for ${email.id}`, error);
      }
    }

    throw error;
  }
}

export async function startEmailWorker() {
  await recoverProcessingEmails();

  const worker = new Worker<EmailJob>('email-send', sendEmail, {
    connection: redis,
    concurrency: config.workerConcurrency,
    // Keep one email per configured interval across this worker.
    limiter: { max: 1, duration: config.minDelayBetweenEmailsMs }
  });

  worker.on('ready', () => {
    console.log(`Email worker ready with concurrency ${config.workerConcurrency}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Email job ${job?.id ?? 'unknown'} failed`, error);
  });

  return worker;
}

startEmailWorker().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
