# ADR-002: Redis Integration (Upstash Serverless)

## Status: Accepted

## Context
In-memory caching (node-cache) and rate limiting (express-rate-limit) reset on every Cloud Run cold start and are not shared across instances. As traffic grows, multiple Cloud Run instances will have inconsistent rate limit counters and duplicated cache misses.

## Decision
Add Redis via Upstash (serverless, pay-per-request) as shared state for cache, rate limiting, and future job queues.

Key design choices:
- **Upstash over Redis Cloud**: Pay-per-request model matches Cloud Run's bursty, scale-to-zero pattern. No idle cost.
- **Graceful degradation**: If Redis is unavailable (connection failure, no REDIS_URL configured), all systems fall back to in-memory. The app never crashes due to Redis being down.
- **ioredis client**: Most mature Node.js Redis client. Supports Lua scripting (needed for atomic rate limiting), pipelining, and automatic reconnection.
- **Lazy connect**: Connection is attempted at startup but failure is non-fatal.

## Alternatives Considered
- **Redis Cloud (fixed instance)**: $5-15/mo minimum even when idle. Cloud Run scales to zero — paying for idle Redis defeats the purpose.
- **Memcached**: No Lua scripting, no persistence. Rate limiter needs atomic operations.
- **DynamoDB/Firestore**: Higher latency for cache operations. Overkill for key-value cache.

## Consequences
**Positive**: Shared state across instances. Cache survives cold starts. Rate limits enforced globally. Cost scales with usage (~$0.20/100K commands on Upstash).
**Negative**: New external dependency. Network latency (~1-5ms to Upstash). Requires REDIS_URL secret in GCP Secret Manager.

## Setup Guide

### Local Development (optional — app works without Redis)
1. Sign up at [upstash.com](https://upstash.com) (free tier: 10K commands/day, 256MB, no credit card)
2. Create a Redis database (pick region closest to your Cloud Run region)
3. Copy the connection string from the Upstash dashboard
4. Add to `backend/.env`: `REDIS_URL=rediss://default:PASSWORD@HOST:PORT`

Without `REDIS_URL`, the app runs entirely in-memory — no Redis needed for local dev.

### Production (Cloud Run)
1. Store `REDIS_URL` in GCP Secret Manager as `REDIS_URL`
2. Already wired in `cloudbuild.yaml` via `--set-secrets REDIS_URL=REDIS_URL:latest`
3. Use Upstash's TLS endpoint (`rediss://`) for encrypted connections

### Cost Estimates (Upstash)
| Tier | Commands/day | Storage | Cost |
|------|-------------|---------|------|
| Free | 10K | 256MB | $0 |
| Pay-as-you-go | Unlimited | 1GB | ~$0.20/100K commands |

## Implementation Notes
- `backend/config/redis.js` — client singleton with reconnect logic
- `REDIS_URL` added to `cloudbuild.yaml` secrets and `.env.example`
- All consumers use `getRedis()` which returns `null` when unavailable
