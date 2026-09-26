# PrepAlgo — Staff-Level Distributed Systems + Fullstack Prep Platform

## Vision

Transform PrepAlgo from a working monolith into a properly architected distributed system that **is itself** a staff-level system design showcase. Each infrastructure component is either battle-tested (use existing) or custom-built (demonstrate deep knowledge), with Architecture Decision Records explaining tradeoffs.

---

## Architecture Diagrams

See [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md) for Mermaid diagrams showing architecture evolution across all phases, request flows, and circuit breaker state machine.

---

## Current Architecture (Post Phase 2b)

| Layer | Tech | Hosting | Status |
|-------|------|---------|--------|
| Frontend | React 18 + Vite, Redux + Saga, styled-components, Monaco Editor | Firebase Hosting (`prepalgo.web.app`) | Working |
| Backend | Express.js monolith (ESM), Mongoose 7 | Cloud Run (`us-central1`) | Working |
| Database | MongoDB Atlas (denormalized fields + compound indexes) | Cloud | Working |
| Auth | Google OAuth + JWT generation (NO route auth middleware) | — | **Broken** |
| Cache | In-memory node-cache (dies on cold start, not shared) | — | **Weak** |
| Rate Limit | express-rate-limit (in-memory, per-instance) | — | **Weak** |
| Code Exec | Python3 child_process, 5s timeout, no sandbox | — | **Unsafe** |
| CDN | Firebase default | — | **Unconfigured** |

**Key models**: Question, User, UserProfile, SolveHistory, DailyRecommendationBatch
**Recommendation engine**: 5 weighted adaptive strategies, topic mastery, learning velocity

### Critical Gaps
1. **No auth middleware** — all API routes publicly accessible, anyone with a userId can read/write data
2. **In-memory everything** — cache and rate limiter reset on cold start, not shared across Cloud Run instances
3. **No API gateway** — routing, auth, rate limiting all tangled in Express middleware
4. **No message queue** — code execution blocks request thread
5. **No sandboxing** — arbitrary Python execution on server
6. **No observability** — no distributed tracing, no structured logging, no correlation IDs
7. **No circuit breakers** — MongoDB outage cascades to all requests
8. **Single monolith** — all logic in one Express app

---

## Phase 2: Distributed Infrastructure (Staff-Level System Design Showcase)

Goal: Fix security gaps, add distributed primitives, document every decision. Each component gets an ADR in `docs/adr/`.

### Phase 2a: Security + Redis Foundation ✅

**Status**: Complete (commit 699e355)

#### 2a.1 — JWT Auth Middleware (Build Custom)
**Why build**: Core security, must understand deeply.
- Create `backend/middleware/auth.js` — verify JWT on every protected route
- Extract user from token, attach to `req.user`
- Public routes: `POST /auth/google`, `GET /health`, `GET /questions` (read-only)
- Protected routes: everything else (solve history, recommendations, submissions, user data)
- Role support: `user`, `admin` (for future content management)
- Reject expired/invalid tokens with proper HTTP 401/403

**Files**:
- `backend/middleware/auth.js` — JWT verification middleware
- `backend/server.js` — apply auth middleware to protected route groups
- `docs/adr/001-auth-middleware.md`

#### 2a.2 — Redis Integration (Use Existing: Redis Cloud / Upstash)
**Why use existing**: Redis itself not worth reimplementing. Focus on patterns.
- Add Redis client (`ioredis`) with connection pooling
- Graceful fallback: if Redis down, degrade to in-memory (log warning, don't crash)
- Connection via `REDIS_URL` env var
- Add to GCP Secret Manager + `cloudbuild.yaml`

**Files**:
- `backend/config/redis.js` — Redis client singleton with reconnect logic
- `docs/adr/002-redis-integration.md`

#### 2a.3 — Distributed Rate Limiter (Build Custom)
**Why build**: Classic system design interview question. Showcase sliding window + token bucket.
- Replace `express-rate-limit` (in-memory) with custom Redis-backed implementation
- **Sliding window counter**: For general API rate limiting (shared across instances)
- **Token bucket**: For code execution (bursty, but capped)
- Lua scripts for atomic Redis operations (no race conditions)
- Per-user rate limiting (not just per-IP) using `req.user` from auth middleware
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Configurable per-route limits (same tiers as current: general, auth, code exec, recommendations)

**Files**:
- `backend/middleware/rateLimiter.js` — rewrite with Redis + algorithms
- `backend/middleware/rateLimiter/slidingWindow.js` — sliding window implementation
- `backend/middleware/rateLimiter/tokenBucket.js` — token bucket implementation
- `docs/adr/003-distributed-rate-limiter.md` — algorithm comparison, why sliding window for API, token bucket for burst

#### 2a.4 — Distributed Cache (Build Custom Patterns on Redis)
**Why build**: Cache invalidation is "one of the two hard problems." Showcase patterns.
- Replace `node-cache` with Redis-backed cache middleware
- **Write-through**: Question updates invalidate cache immediately
- **Cache-aside**: Recommendations fetched from cache, miss goes to DB
- **TTL strategy**: Same tiers (questions 24h, recommendations 5min, user 30min)
- Cache key namespacing: `prepalgo:cache:{route}:{params}`
- **Cache stampede protection**: Mutex lock on cache miss (only one request rebuilds)
- Bulk invalidation: `invalidateUserCache(userId)` clears all user-scoped keys via pattern
- Cache hit/miss metrics (log, expose via health endpoint)

**Files**:
- `backend/middleware/cache.js` — rewrite with Redis
- `backend/utils/cachePatterns.js` — write-through, cache-aside, stampede lock
- `docs/adr/004-caching-strategy.md` — pattern comparison, invalidation strategy, TTL rationale

### Phase 2b: Async Processing + Resilience ✅

**Status**: Complete (2026-09-25)

#### 2b.1 — Message Queue for Code Execution (Build Custom on Redis)
**Why build**: Async job processing is core distributed systems knowledge.
- Use BullMQ (Redis-backed job queue) for code execution
- **Producer**: API endpoint enqueues job, returns job ID immediately
- **Consumer**: Worker process picks up job, executes code, stores result
- **Polling/SSE**: Client polls `GET /jobs/:jobId/status` or subscribes via SSE
- Job timeout: 10s (vs current 5s — queue gives us breathing room)
- Job retry: 1 retry on transient failure, then fail
- **Backpressure**: Max queue depth per user (prevent abuse)
- Dead letter queue for failed jobs (debugging)

**Files**:
- `backend/queues/codeExecutionQueue.js` — BullMQ queue definition
- `backend/workers/codeExecutionWorker.js` — consumer process
- `backend/routes/jobs.js` — job status endpoint
- `docs/adr/005-async-code-execution.md` — sync vs async tradeoffs, why BullMQ

#### 2b.2 — Circuit Breaker (Build Custom)
**Why build**: Classic resilience pattern, frequently asked in system design interviews.
- Custom implementation with three states: CLOSED, OPEN, HALF_OPEN
- Wrap MongoDB calls and external service calls
- **Thresholds**: 5 failures in 30s opens circuit
- **Recovery**: After 30s open, allow 1 probe request (half-open)
- **Fallback**: Serve stale cache when DB circuit open (graceful degradation)
- Per-service circuit state (MongoDB, Redis, external APIs each have own breaker)
- Expose circuit state via health endpoint

**Files**:
- `backend/utils/circuitBreaker.js` — state machine implementation
- `backend/config/db.js` — wrap MongoDB operations
- `docs/adr/006-circuit-breaker.md` — state diagram, threshold rationale

#### 2b.3 — Observability Foundation
**Why**: Can't operate distributed system without visibility.
- **Structured logging**: Replace `console.log` with `pino` (JSON structured logs)
- **Correlation IDs**: Generate UUID per request, propagate through all log lines
- **Request logging**: Method, path, status, duration, user ID, correlation ID
- **Health checks**: Shallow (`/health` — is process alive) + Deep (`/health/ready` — DB connected, Redis connected, queue healthy)
- **Metrics endpoint**: `/metrics` — request count, latency percentiles, cache hit rate, circuit breaker state, queue depth

**Files**:
- `backend/middleware/requestLogger.js` — structured request logging with correlation ID
- `backend/middleware/correlationId.js` — generate/propagate correlation ID
- `backend/routes/health.js` — deep health check endpoint
- `backend/utils/logger.js` — pino logger setup
- `docs/adr/007-observability.md`

### Phase 2c: Production Hardening (Lightweight) ✅

**Decision**: Gateway + service extraction deferred — overkill at current scale (<100 DAU). Implemented production essentials instead. Full gateway plan preserved below for when traffic justifies it.

#### 2c.1 — CDN Headers ✅
- Firebase Hosting headers: `immutable` for hashed Vite assets (JS/CSS/images/fonts), `no-cache` for index.html
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

#### 2c.2 — Request Validation (Zod) ✅
- `backend/middleware/validate.js` — generic Zod validation middleware
- `backend/schemas/code.js` — schemas for all mutation endpoints
- Applied to: code execution, submission, test case updates, template updates, question updates, solve history
- Replaces ~80 lines of manual validation with declarative schemas
- Returns structured error responses with field-level details

#### 2c.3 — API Versioning ✅
- Already in place: all routes under `/api/v1/`

---

### Phase 2c-deferred: API Gateway + Service Extraction

> Preserved for when traffic exceeds single-service capacity (~1,000+ DAU).

#### Gateway Service (Build Custom)
- Separate Express service: auth, rate limiting, routing, request transformation, CORS
- Request pipeline: CORS → Correlation ID → Auth → Rate Limit → Route → Proxy → Response Transform
- Declarative route config (YAML/JSON)
- API key support for programmatic access
- ADR: `docs/adr/008-api-gateway.md`

#### Code Execution Service Extraction
- Standalone sandboxed service (Docker/gVisor on Cloud Run)
- Resource limits: CPU, memory, no network for user code
- Independent scaling, gateway routes `/code/*` to it
- ADR: `docs/adr/009-code-execution-isolation.md`

#### CDN Optimization (Future)
- Service Worker for offline question browsing
- Preconnect hints for API domain
- ADR: `docs/adr/010-cdn-strategy.md`

---

## Phase 3: Multi-Domain Content Expansion

> Previously "Phase 2" in old plan. Deferred until infrastructure is solid.

1. Add `domain`, `answerFormat`, `mcqConfig`, `topics` to Question schema
2. Create Concept and DesignExercise models
3. Add `runJavaScriptCode()` for frontend coding problems
4. New API routes (concepts, design-exercises)
5. Domain filtering on question/recommendation APIs
6. Seed data for frontend + system design content
7. Frontend pages: FrontendQuestions, SystemDesignQuestions, ConceptViewer, DesignExerciseWorkspace
8. Navbar with domain navigation

Full schema details preserved from original plan — see git history if needed.

## Phase 4: Guided Study System

1. LearningPath and UserLearningProgress models
2. Adaptive next-item logic with path-aware daily recommendations
3. Frontend: LearningPaths browse, LearningPathDetail timeline, LearningSession
4. "Continue Learning" card on Home page

## Phase 5: AI Review + Polish

1. Claude API integration for system design review
2. Leitner spaced repetition
3. Progress dashboard (heatmap, radar chart, streak badges)
4. Mock interview mode (timed, no hints)

---

## Architecture Decision Records (ADRs)

Each Phase 2 component gets an ADR in `docs/adr/` following this template:

```markdown
# ADR-NNN: Title

## Status: Proposed | Accepted | Deprecated

## Context
What problem are we solving? Why now?

## Decision
What we chose and the key design details.

## Alternatives Considered
What else we evaluated and why we rejected it.

## Consequences
Positive: what improves.
Negative: what gets harder (operational complexity, new dependencies).

## Implementation Notes
Key files, dependencies, deployment changes.
```

---

## Deployment Architecture (Target State)

```
                    ┌─────────────┐
                    │  Cloudflare  │
                    │  / Firebase  │
                    │     CDN      │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐      ┌────────▼────────┐
     │  Firebase        │      │  API Gateway     │
     │  Hosting         │      │  (Cloud Run)     │
     │  (Static SPA)    │      │  Auth + Rate     │
     └─────────────────┘      │  Limit + Route   │
                               └────────┬────────┘
                                        │
                    ┌───────────────────┬┴──────────────────┐
                    │                   │                    │
           ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
           │  Main API      │  │  Code Exec     │  │  Future:       │
           │  Service        │  │  Service        │  │  Recommendation│
           │  (Cloud Run)   │  │  (Cloud Run)   │  │  Service        │
           └───────┬───────┘  └───────┬───────┘  └───────────────┘
                   │                   │
          ┌────────┴────────┐         │
          │                 │         │
   ┌──────▼──────┐  ┌──────▼──────┐  │
   │  MongoDB     │  │  Redis       │  │
   │  Atlas       │  │  (Upstash/   │◄─┘
   │              │  │   Cloud)     │
   └─────────────┘  └─────────────┘
                    (cache, rate limit,
                     queue, circuit state)
```

---

## Implementation Order + Effort Estimates

| Sub-Phase | Component | Effort | Staff Signal |
|-----------|-----------|--------|-------------|
| **2a.1** | Auth middleware | 1 day | Security fundamentals |
| **2a.2** | Redis integration | 0.5 day | Infrastructure |
| **2a.3** | Distributed rate limiter | 2 days | Algorithm design (sliding window, token bucket) |
| **2a.4** | Distributed cache | 1.5 days | Cache patterns (write-through, stampede) |
| **2b.1** | Message queue | 2 days | Async processing, backpressure |
| **2b.2** | Circuit breaker | 1 day | Resilience patterns |
| **2b.3** | Observability | 1 day | Operational maturity |
| **2c.1** | API gateway | 2 days | System design centerpiece |
| **2c.2** | Code exec service | 2 days | Security isolation, microservice extraction |
| **2c.3** | CDN config | 0.5 day | Performance |

**Total Phase 2: ~14 days**

---

## Verification Plan

- **2a**: Auth middleware rejects unauthenticated requests. Redis cache survives cold start. Rate limiter shared across instances (test with 2 Cloud Run instances). Cache stampede test with concurrent requests.
- **2b**: Code execution returns via job polling. Circuit breaker opens on DB kill, serves stale cache. Correlation IDs trace through logs.
- **2c**: Gateway routes to correct service. Code execution sandboxed (can't access filesystem/network). CDN serves cached assets with correct headers.

**Backward compatibility**: Every sub-phase deployable independently. Frontend changes only needed for job polling (2b.1) and CDN headers (2c.3).
