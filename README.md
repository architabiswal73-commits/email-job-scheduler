# Email Job Scheduler

ReachInbox intern assignment: schedule email batches with Express, Prisma, BullMQ, Redis, Elasticsearch, Ethereal SMTP, Google OAuth, Slack OAuth, React, Vite, and Tailwind.

## Setup

Prerequisites:

- Node.js 22+
- Docker and Docker Compose
- Google OAuth credentials
- Slack app credentials with the `incoming-webhook` scope

Start infrastructure from the repository root:

```bash
docker compose up -d
```

On this Linux machine, Docker is optional. PostgreSQL 18.6 and Redis 8.10.1 are installed in the user-space Conda environment at `~/miniforge3`, and Elasticsearch is disabled through `ELASTICSEARCH_ENABLED=false`. Start that local setup, API, worker, and frontend with:

```bash
./scripts/start-local.sh
```

The script stores service logs under `~/.email-job-scheduler/`.

Create the backend environment file and fill in the real OAuth values:

```bash
cp backend/.env.example backend/.env
```

The important runtime settings are:

```text
DATABASE_URL
REDIS_URL
ELASTICSEARCH_URL
PORT
FRONTEND_URL
SESSION_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET
SLACK_REDIRECT_URI
WORKER_CONCURRENCY
MIN_DELAY_BETWEEN_EMAILS_MS
MAX_EMAILS_PER_HOUR_PER_SENDER
```

Install and migrate the backend:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
```

Run the API and worker in separate terminals:

```bash
cd backend
npm run dev
```

```bash
cd backend
npm run worker
```

Install and run the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/login`. Google OAuth must redirect to:
`http://localhost:4000/auth/google/callback`.

## Architecture

```text
                         +----------------------+
                         | React + Vite frontend |
                         | login / dashboard    |
                         +----------+-----------+
                                    |
                         credentialed HTTP / OAuth
                                    |
                         +----------v-----------+
                         | Express API           |
                         | auth, scheduling,     |
                         | search, Slack         |
                         +----+-------------+----+
                              |             |
                    Prisma / SQL       Bull Board
                              |             |
                    +---------v--+   +------v------+
                    | PostgreSQL |   | Redis        |
                    | users,     |   | delayed jobs |
                    | senders,   |   | rate limits  |
                    | emails     |   +------+-------+
                    +------------+          |
                                            |
                                  +---------v---------+
                                  | BullMQ email worker|
                                  | throttled SMTP     |
                                  +----+----------+----+
                                       |          |
                               +-------v--+   +---v-----------+
                               | Ethereal |   | Elasticsearch |
                               | SMTP     |   | email search  |
                               +----------+   +---------------+
                                            
                                  +----------------+
                                  | Slack webhook  |
                                  | notifications  |
                                  +----------------+
```

## How scheduling works

`POST /api/emails/schedule` validates the request, removes duplicate recipients, creates one `Email` row per recipient in a single transaction, and assigns existing senders round-robin. If the user has no senders, three Ethereal test accounts are created and saved first.

Each email gets its own BullMQ delayed job in the `email-send` queue. The job ID is the email ID. `scheduledAt` is calculated as:

```text
startTime + recipientIndex * delayBetweenMs
```

The selected minimum delay is **2 seconds** (`MIN_DELAY_BETWEEN_EMAILS_MS=2000`). It is long enough to make local/demo sending readable, avoids an unnecessarily aggressive SMTP burst, and still keeps small batches practical. Production deployments can change it through the environment without changing code.

The worker uses BullMQ's limiter for one send per configured interval. It also uses the request's hourly limit, capped by `MAX_EMAILS_PER_HOUR_PER_SENDER`.

## Redis hourly limits

For each sender and UTC hour, the worker increments this Redis key atomically:

```text
rl:{senderId}:{YYYYMMDDHH}
```

The Lua script performs `INCR` and sets `EXPIRE` only when the counter is first created. This is safe across multiple workers and API/worker instances. A `SET NX` notification key ensures Slack is notified only once per sender/hour.

When the counter reaches the limit, the email is not failed or dropped. The worker changes its database status back to `scheduled`, updates `scheduledAt`, and moves the same BullMQ job to the next UTC hour. The order offset is derived from the original recipient order, so deferred emails retain their ordering.

Trade-offs:

- A low hourly limit can push a large batch several hours into the future.
- Ordering is preserved, but strict global ordering can reduce throughput when senders have different limits.
- The limit is applied when a worker is ready to send, so jobs remain durable in Redis rather than being held in process memory.

## Idempotency and restarts

Every job uses `jobId=email.id`, so the same email cannot be enqueued under a second job ID. Before SMTP delivery, the worker atomically updates the row from `scheduled` to `processing`. If no row is updated, another worker already owns or completed it and the job is skipped.

On success the row becomes `sent` with `sentAt`. After the final retry it becomes `failed` with the error. BullMQ delayed jobs survive API and worker restarts in Redis. At worker startup, rows left in `processing` are reset to `scheduled`; BullMQ stalled-job recovery then reclaims jobs whose worker died. See [scripts/restartTest.md](scripts/restartTest.md) for a manual verification checklist.

## Search and operations

The API creates the Elasticsearch `emails` index on boot with mappings for subject, body, recipient, status, user ID, scheduled time, and sent time. `GET /api/emails/search?q=&status=` always filters by the authenticated user.

Elasticsearch is optional for local development. Set `ELASTICSEARCH_ENABLED=false` to make indexing and Elasticsearch search no-ops; search then falls back to PostgreSQL `ILIKE`-style matching. This keeps scheduling and delivery usable on machines where Elasticsearch is too heavy, at the cost of less powerful search and no Elasticsearch index.

Bull Board is available at `/admin/queues` and requires the signed session cookie.

## Google and Slack demo

1. Start the API, worker, frontend, and Docker services.
2. Open `http://localhost:5173/login`.
3. Click **Sign in with Google** and complete the OAuth consent flow.
4. On the dashboard, click **Connect Slack** and select a Slack workspace/channel.
5. Confirm `GET /slack/status` reports `connected: true`.
6. Schedule a batch with a low hourly limit.
7. When the worker reaches the limit, confirm one Slack notification arrives for that sender/hour.
8. Click **Disconnect Slack** and confirm the status changes to `connected: false`.

Slack webhook URLs are stored in PostgreSQL. The worker reads the current URL from the database for every notification, so connecting or disconnecting Slack works without a redeploy. Slack failures are logged and never crash the worker.

## Load test

The load test intentionally schedules 1,000 recipients with `hourlyLimit: 1` to demonstrate rollover. It requires a real authenticated session cookie:

```bash
cd backend
LOAD_TEST_SESSION_COOKIE='session=your-cookie-value' npm run load-test
```
