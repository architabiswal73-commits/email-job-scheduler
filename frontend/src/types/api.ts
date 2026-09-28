export type User = {
  name: string;
  email: string;
  avatar: string;
};

export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export type Email = {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string;
};

export type EmailListResponse = {
  emails: Email[];
  page?: number;
  pageSize?: number;
  total?: number;
};

export type ScheduleInput = {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenMs: number;
  hourlyLimit: number;
};

export type ScheduleResponse = {
  batchId: string;
  count: number;
};

export type SlackStatus = {
  connected: boolean;
};
