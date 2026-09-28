import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { db } from '../db/client';
import { config } from '../config/env';
import { emailQueue } from '../queues/emailQueue';
import { indexEmail } from './emailSearch';

type ScheduleInput = {
  subject: string;
  body: string;
  recipients: string[];
  startTime: Date;
  delayBetweenMs: number;
  hourlyLimit: number;
};

export async function scheduleEmails(userId: string, input: ScheduleInput) {
  const recipients = [...new Set(input.recipients.map((email) => email.trim().toLowerCase()))];
  const batchId = randomUUID();
  const now = Date.now();

  const emails = await db.$transaction(async (tx) => {
    let senders = await tx.sender.findMany({
      where: { userId },
      orderBy: { id: 'asc' }
    });

    if (senders.length === 0) {
      const accounts = await Promise.all([
        nodemailer.createTestAccount(),
        nodemailer.createTestAccount(),
        nodemailer.createTestAccount()
      ]);

      await tx.sender.createMany({
        data: accounts.map((account) => ({
          email: account.user,
          smtpHost: account.smtp.host,
          smtpPort: account.smtp.port,
          smtpUser: account.user,
          smtpPass: account.pass,
          userId
        }))
      });

      senders = await tx.sender.findMany({
        where: { userId },
        orderBy: { id: 'asc' }
      });
    }

    return Promise.all(
      recipients.map((toEmail, index) =>
        tx.email.create({
          data: {
            userId,
            senderId: senders[index % senders.length].id,
            toEmail,
            subject: input.subject,
            body: input.body,
            scheduledAt: new Date(input.startTime.getTime() + index * input.delayBetweenMs),
            batchId
          }
        })
      )
    );
  });

  await Promise.all(
    emails.map((email, index) =>
      emailQueue.add(
        'send-email',
        {
          emailId: email.id,
          hourlyLimit: input.hourlyLimit,
          originalScheduledAt: email.scheduledAt.getTime(),
          order: index
        },
        {
          jobId: email.id,
          delay: Math.max(0, email.scheduledAt.getTime() - now)
        }
      )
    )
  );

  await Promise.all(emails.map((email) => indexEmail(email.id, email)));

  return { batchId, count: emails.length };
}

export function validateScheduleLimits(delayBetweenMs: number, hourlyLimit: number) {
  if (delayBetweenMs < config.minDelayBetweenEmailsMs) {
    return `delayBetweenMs must be at least ${config.minDelayBetweenEmailsMs}`;
  }

  if (hourlyLimit > config.maxEmailsPerHourPerSender) {
    return `hourlyLimit cannot exceed ${config.maxEmailsPerHourPerSender}`;
  }

  return null;
}
