import 'dotenv/config';

const baseUrl = process.env.LOAD_TEST_URL ?? 'http://localhost:4000';
const sessionCookie = process.env.LOAD_TEST_SESSION_COOKIE;
const delayBetweenMs = Number(process.env.MIN_DELAY_BETWEEN_EMAILS_MS);

if (!sessionCookie) {
  throw new Error('LOAD_TEST_SESSION_COOKIE is required');
}

if (!Number.isFinite(delayBetweenMs)) {
  throw new Error('MIN_DELAY_BETWEEN_EMAILS_MS is required');
}

const response = await fetch(`${baseUrl}/api/emails/schedule`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    cookie: sessionCookie
  },
  body: JSON.stringify({
    subject: 'Scheduler load test',
    body: 'Load test email',
    recipients: Array.from({ length: 1000 }, (_, index) => `load-test-${Date.now()}-${index}@example.com`),
    startTime: new Date(Date.now() + 5000).toISOString(),
    delayBetweenMs,
    hourlyLimit: 1
  })
});

console.log(response.status, await response.text());
