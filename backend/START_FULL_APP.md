# Start Full App

This repo is the backend stack for Silver Surfers. To run it locally with the current production-style setup, you need these pieces:

- MongoDB
- Redis
- Scanner service
- API server
- Optional: S3 and SMTP for report delivery

The frontend is not in this repo, but your current `.env` points to `FRONTEND_URL=http://localhost:3000`.

## 1. Prerequisites

- Node.js `22.18+`
- `pnpm`
- Docker installed
- A valid `.env` file in the repo root

## 2. Install dependencies

From the project root:

```bash
pnpm install
```

## 3. Required environment

Your `.env` should have at least:

```env
PORT=8000
MONGODB_URI=your-mongodb-uri
JWT_SECRET=your-secret
FRONTEND_URL=http://localhost:3000
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...

REDIS_URL=redis://127.0.0.1:6379/0
QUEUE_BACKEND=bullmq
BULLMQ_PREFIX=silver-surfers

AWS_S3_BUCKET=your-bucket
AWS_REGION=ap-south-1
AWS_S3_PREFIX=silver-surfers
AWS_S3_SIGNED_URL_EXPIRES_SECONDS=604800
```

Notes:

- If `REDIS_URL` is set, the backend will use BullMQ.
- If `AWS_S3_BUCKET` and `AWS_REGION` are set, report files will upload to S3.
- If S3 is not configured, email delivery falls back to Google Drive.

## 4. Start Redis

Redis does not auto-run from this repo. Start it yourself first.

Recommended:

```bash
docker run -d --name silver-redis -p 6379:6379 redis:7-alpine
```

Check it:

```bash
docker ps
```

If you have `redis-cli` installed:

```bash
redis-cli ping
```

Expected result:

```text
PONG
```

If the container already exists and is stopped:

```bash
docker start silver-redis
```

## 5. Start the scanner service

In one terminal:

```bash
pnpm run scanner:dev
```

This starts the scanner on port `8001`.

Health check:

```bash
curl http://localhost:8001/health
```

## 6. Start the API server

In another terminal:

```bash
pnpm run dev
```

This starts the API on port `8000`.

Health check:

```bash
curl http://localhost:8000/health
```

If your app does not expose `/health` on the API side, just confirm the server boot log shows the API is listening on port `8000`.

## 7. Recommended startup order

Start services in this order:

1. Redis
2. Scanner service
3. API server
4. Frontend app from your frontend repo

## 8. What should be running

You should end up with:

- Redis on `6379`
- Scanner service on `8001`
- API server on `8000`
- Frontend on `3000`

## 9. Quick local run checklist

Terminal 1:

```bash
docker start silver-redis || docker run -d --name silver-redis -p 6379:6379 redis:7-alpine
```

Terminal 2:

```bash
pnpm run scanner:dev
```

Terminal 3:

```bash
pnpm run dev
```

## 10. Common problems

### Redis connection error

If you see BullMQ or Redis connection errors:

- make sure Docker is running
- make sure `silver-redis` is up
- make sure `.env` has `REDIS_URL=redis://127.0.0.1:6379/0`

### Scanner failures

If quick scan or audit requests fail:

- make sure `pnpm run scanner:dev` is running
- check `http://localhost:8001/health`
- make sure Chrome or Chromium is available on the machine

### S3 upload failures

If reports are generated but upload fails:

- verify `AWS_S3_BUCKET`
- verify `AWS_REGION`
- verify AWS credentials or IAM role access
- confirm the bucket policy allows uploads and downloads

### Email failures

If scans finish but emails fail:

- verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- confirm your SMTP credentials are valid

## 11. Test the backend

Run the full test suite:

```bash
pnpm test
```

## 12. Stop everything

Stop API and scanner with `Ctrl+C`.

Stop Redis:

```bash
docker stop silver-redis
```

Remove the Redis container if you want:

```bash
docker rm silver-redis
```
