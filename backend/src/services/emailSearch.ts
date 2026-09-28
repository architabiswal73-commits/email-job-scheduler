import { Client } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { config } from '../config/env';
import { db } from '../db/client';

const index = 'emails';
const client = new Client({ node: config.elasticsearchUrl });
let disabledLogged = false;

function ensureEnabled() {
  if (config.elasticsearchEnabled) return true;
  if (!disabledLogged) {
    console.warn('Elasticsearch disabled; using PostgreSQL search fallback');
    disabledLogged = true;
  }
  return false;
}

type EmailDocument = {
  subject: string;
  body: string;
  toEmail: string;
  status: string;
  userId: string;
  scheduledAt: Date;
  sentAt: Date | null;
};

export async function initEmailSearch() {
  if (!ensureEnabled()) return;
  const exists = await client.indices.exists({ index });
  if (!exists) {
    await client.indices.create({
      index,
      mappings: {
        properties: {
          subject: { type: 'text' },
          body: { type: 'text' },
          toEmail: { type: 'text' },
          status: { type: 'keyword' },
          userId: { type: 'keyword' },
          scheduledAt: { type: 'date' },
          sentAt: { type: 'date' }
        }
      }
    });
  }
}

export async function indexEmail(id: string, email: EmailDocument) {
  if (!ensureEnabled()) return;
  await client.index({ index, id, document: email, refresh: 'wait_for' });
}

export async function updateEmailStatus(id: string, status: string, sentAt: Date | null, error?: string | null) {
  if (!ensureEnabled()) return;
  await client.update({
    index,
    id,
    doc: { status, sentAt, ...(error ? { error } : {}) },
    refresh: 'wait_for'
  });
}

export async function updateEmailSchedule(id: string, scheduledAt: Date) {
  if (!ensureEnabled()) return;
  await client.update({
    index,
    id,
    doc: { scheduledAt },
    refresh: 'wait_for'
  });
}

export async function searchEmails(userId: string, query?: string, status?: string) {
  if (!ensureEnabled()) {
    const emails = await db.email.findMany({
      where: {
        userId,
        ...(status ? { status: status as 'scheduled' | 'sent' | 'failed' } : {}),
        ...(query ? { OR: [{ subject: { contains: query, mode: 'insensitive' } }, { body: { contains: query, mode: 'insensitive' } }, { toEmail: { contains: query, mode: 'insensitive' } }] } : {})
      },
      orderBy: { scheduledAt: 'asc' }
    });
    return emails;
  }
  const filters: QueryDslQueryContainer[] = [{ term: { userId } }];
  if (status) {
    filters.push({ term: { status } });
  }

  const result = await client.search<EmailDocument>({
    index,
    query: {
      bool: {
        must: query ? [{ multi_match: { query, fields: ['subject', 'body', 'toEmail'] } }] : [{ match_all: {} }],
        filter: filters
      }
    }
  });

  return result.hits.hits.map((hit) => ({ id: hit._id, ...hit._source }));
}