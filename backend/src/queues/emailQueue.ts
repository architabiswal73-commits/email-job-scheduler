import { Queue } from 'bullmq';
import { redis } from './connection';

export type EmailJob = {
  emailId: string;
  hourlyLimit: number;
  originalScheduledAt: number;
  order: number;
};

export const emailQueue = new Queue<EmailJob>('email-send', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  }
});
