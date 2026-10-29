# ADR-004: Distributed Caching Strategy

## Status: Superseded

Superseded after content moved to git (ADR-009) and user data to PostgreSQL.
`backend/middleware/cache.js` is now only a bounded, process-local cache for
unauthenticated public catalog GETs; private routes are `no-store`, and there is
no Redis response cache, stampede lock or per-user invalidation. Redis is used
for rate limits only. The original decision is kept below for history.

## Context
In-memory node-cache resets on every Cloud Run cold start and is not shared across instances. Each instance rebuilds its cache independently, causing redundant database queries and inconsistent response times.

## Decision
Two-tier cache: Redis (shared, persistent across restarts) + local node-cache (fast, per-instance hot cache).

### Cache Patterns

**Cache-Aside (read path)**:
1. Check Redis for cached response
2. If miss, check local node-cache
3. If miss, query database, store in both Redis and local cache
4. Local cache TTL capped at 5 minutes (prevents serving stale data too long per-instance)

**Write-Through (invalidation)**:
- On write operations (solve history update, recommendation refresh), invalidate affected keys in both Redis and local cache
- Pattern-based invalidation: `invalidateUserCache(userId)` clears all user-scoped keys

### Cache Stampede Protection
When cache misses, a Redis-based mutex lock (`SET key NX PX 5000`) prevents multiple concurrent requests from all hitting the database simultaneously. Only one request rebuilds the cache; others wait 100ms and retry from Redis.

### TTL Strategy (unchanged from Phase 1)
| Route | TTL | Rationale |
|-------|-----|-----------|
| `/questions` | 24 hours | Question data rarely changes |
| `/recommendations` | 5 minutes | Personalized, refreshes often |
| `/authentication/user/` | 30 minutes | User profile, moderate change rate |
| Default | 1 hour | Safe default |

### Key Namespace
`prepalgo:cache:{url}` — namespaced to avoid collisions with rate limiter keys.

## Alternatives Considered
- **Redis only (no local cache)**: Every cache hit adds ~1-5ms network latency. Local hot cache serves repeated requests in <0.1ms.
- **Write-behind**: Batches writes for efficiency but risks data loss if process crashes before flush. Not worth the complexity for our write volume.
- **CDN-level caching**: Good for static assets (handled separately in ADR-010), but API responses are user-specific and can't be CDN-cached without Vary headers complexity.

## Consequences
**Positive**: Cache survives cold starts. Shared across instances. Stampede protection prevents thundering herd. Two-tier gives both speed and durability.
**Negative**: Cache invalidation across two tiers adds complexity. Local cache can briefly serve stale data (max 5 min). Redis KEYS command for pattern invalidation is O(N) — acceptable at our scale, would need SCAN for large keyspaces.

## Implementation Notes
- `backend/middleware/cache.js` — rewritten with Redis + local cache + stampede lock
- `invalidateCache()` and `invalidateUserCache()` now async (clear both tiers)
- Same export interface — no changes needed in consumers
