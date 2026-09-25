# ADR-003: Distributed Rate Limiter

## Status: Accepted

## Context
`express-rate-limit` uses in-memory storage — each Cloud Run instance has its own counter. With N instances, the effective rate limit is N * configured limit. Rate limits also reset on cold start.

## Decision
Custom Redis-backed rate limiter with two algorithms:

### Sliding Window Counter (general API, auth, recommendations)
- Uses Redis sorted set with timestamps as scores
- Lua script atomically: removes expired entries, counts current window, adds new entry if under limit
- Precise — no boundary issues like fixed window counters
- Key format: `ratelimit:{prefix}:{identifier}`

### Token Bucket (code execution)
- Uses Redis hash with `tokens` and `lastRefill` fields
- Allows short bursts (up to bucket capacity) while enforcing long-term rate
- Better UX for code execution: user can run 10 tests quickly, then waits for refill
- Refill rate: 0.167 tokens/second (10 per minute)

### Identifier Strategy
- Authenticated users: `user:{userId}` — rate limit per user, not per IP
- Unauthenticated: `ip:{req.ip}` — fallback to IP-based

### Rate Limit Headers
All responses include: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` (on 429)

### Graceful Fallback
If Redis unavailable, falls back to per-instance in-memory Map with same algorithm logic. Cleanup interval prevents memory leaks.

## Alternatives Considered
- **Fixed window counter**: Simpler but has boundary burst problem (2x limit at window edges).
- **Leaky bucket**: Smooths traffic but penalizes legitimate burst patterns. Code execution is inherently bursty.
- **express-rate-limit with Redis store**: Uses someone else's Redis store adapter. Less control, can't showcase algorithm knowledge.

## Consequences
**Positive**: Globally consistent rate limits. Per-user fairness. Atomic operations via Lua (no race conditions). Two distinct algorithms demonstrate understanding of tradeoffs.
**Negative**: Lua scripts add complexity. Redis latency on every request (~1-2ms). In-memory fallback has same old per-instance problem (acceptable degradation).

## Implementation Notes
- `backend/middleware/rateLimiter/slidingWindow.js` — sliding window algorithm
- `backend/middleware/rateLimiter/tokenBucket.js` — token bucket algorithm
- `backend/middleware/rateLimiter/index.js` — middleware factory, same tier config as before
- `express-rate-limit` dependency removed
