# Restart test

Use this checklist to verify delayed jobs survive restarts and each email is sent once.

- [ ] Start PostgreSQL, Redis, and Elasticsearch:
  `docker compose up -d`
- [ ] Start the API with the real `backend/.env`:
  `cd backend && npm run dev`
- [ ] Start the worker in a second terminal:
  `cd backend && npm run worker`
- [ ] Sign in at `http://localhost:5173/login`.
- [ ] Schedule at least three emails for a few minutes in the future.
- [ ] Record the returned `batchId` and recipient addresses.
- [ ] Confirm the emails appear in the Scheduled Emails table.
- [ ] Kill the API process while the jobs are delayed.
- [ ] Kill the worker process while the jobs are delayed.
- [ ] Restart the API and worker.
- [ ] Wait until the scheduled times pass.
- [ ] Confirm every recipient receives exactly one email.
- [ ] Confirm each row appears as `sent` with one `sentAt` value.
- [ ] Confirm there are no duplicate SMTP messages or duplicate sent rows.
- [ ] Repeat with a worker killed after a job starts processing to exercise recovery of stale `processing` rows.
