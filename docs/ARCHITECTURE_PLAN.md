# PrepAlgo — Staff-Level Distributed Systems + Fullstack Prep Platform

## Vision

Transform PrepAlgo from a working monolith into a properly architected distributed system that **is itself** a staff-level system design showcase. Each infrastructure component is either battle-tested (use existing) or custom-built (demonstrate deep knowledge), with Architecture Decision Records explaining tradeoffs.

---

## Architecture Diagrams

See [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md) for Mermaid diagrams showing architecture evolution across all phases, request flows, and circuit breaker state machine.

---

## Current Architecture (Post Phase 3)

| Layer | Tech | Hosting | Status |
|-------|------|---------|--------|
| Frontend | React 18 + Vite, Redux + Saga, styled-components, Monaco Editor (CDN-loaded) | Firebase Hosting (`prepalgo.web.app`) | Working |
| Backend | Express.js monolith (ESM), Mongoose 7 | Cloud Run (`us-central1`) | Working |
| Database | MongoDB Atlas (denormalized fields + compound indexes) | Cloud | Working |
| Auth | Google OAuth + JWT, `protect` middleware on all private route groups, `requireSelf` ownership checks, `authorize('admin')` on content mutations | — | Working |
| Cache | Two-tier: node-cache (L1) + Redis/Upstash (L2), stampede protection | — | Working |
| Rate Limit | Distributed sliding window on Redis | — | Working |
| Code Exec | Python3 `child_process.spawn`, 5s timeout, **no sandbox** | — | **Unsafe** |
| CDN | Firebase Hosting headers (`immutable` hashed assets, `no-cache` index.html) + security headers | — | Working |
| Async | BullMQ queue on Redis for code execution | — | Working |
| Resilience | Circuit breakers (opossum) around MongoDB | — | Working |
| Observability | pino structured logs, correlation IDs, deep `/health` | — | Partial (no `/metrics`) |

**Key models**: Question, User, UserProfile, SolveHistory, DailyRecommendationBatch
**Recommendation engine**: 5 weighted adaptive strategies, topic mastery, learning velocity, domain-weighted slot allocation

### Critical Gaps

Resolved since this list was written:
- ~~**No auth middleware**~~ — resolved in Phase 2a; ownership + role checks added later.
- ~~**In-memory everything**~~ — resolved in Phase 2a (Redis-backed cache + rate limiter).
- ~~**No message queue**~~ — resolved in Phase 2b (BullMQ).
- ~~**No observability**~~ — largely resolved in Phase 2b (pino, correlation IDs, deep `/health`).
- ~~**No circuit breakers**~~ — resolved in Phase 2b (opossum around MongoDB).

Still open:
1. **No sandboxing** — arbitrary Python executed via `spawn('python3')` in
   `backend/utils/codeExecution.js`; only a 5s timeout guards it. Highest-severity
   remaining risk.
2. **No `/metrics` endpoint** — request/latency/cache-hit metrics are not exposed;
   only `/health` reports component state.
3. **No API gateway** — routing, auth, and rate limiting remain tangled in Express
   middleware. Deliberately deferred (see Phase 2c-deferred) as overkill at current scale.
4. **Single monolith** — all logic in one Express app. Deliberately deferred.
5. **Data modelling** — static content is stored and served as if it were dynamic; System
   Design is modelled as solvable questions rather than readable topics; several embedded
   arrays grow without bound. See [Architecture V2](#architecture-v2-contentuser-split--proposed).

---

## Phase 2: Distributed Infrastructure (Staff-Level System Design Showcase)

Goal: Fix security gaps, add distributed primitives, document every decision. Each component gets an ADR in `docs/adr/`.

### Phase 2a: Security + Redis Foundation ✅

**Status**: Complete (commit 699e355)

#### 2a.1 — JWT Auth Middleware (Build Custom)
**Why build**: Core security, must understand deeply.
- Create `backend/middleware/auth.js` — verify JWT on every protected route
- Extract user from token, attach to `req.user`
- Public routes: `POST /auth/google`, `GET /health`, `GET /questions` (read-only). Note: the
  content-mutating `PUT` routes mounted under `/api/v1/questions` were later gated behind
  `authorize('admin')`, so the router is public for reads only.
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
- ❌ Cache hit/miss metrics (log, expose via health endpoint) — **not implemented**.
  `backend/middleware/cache.js` records no hit/miss counters and `/health` does not
  report cache statistics.

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
- **Structured logging** ✅: Replaced `console.log` with `pino` (JSON structured logs)
- **Correlation IDs** ✅: Generate UUID per request, propagate through all log lines, echo as `X-Correlation-ID`
- **Request logging** ✅: Method, path, status, duration, content length, user ID, correlation ID
- **Health check** ✅: A single deep `GET /health` reports MongoDB, Redis, queue, and circuit-breaker state; returns 503 when unhealthy, 200 when `ok`/`degraded`. The originally planned shallow/deep split (`/health` + `/health/ready`) was collapsed into this one endpoint.
- **Metrics endpoint** ❌ **NOT IMPLEMENTED**: `/metrics` (request count, latency percentiles, cache hit rate, circuit breaker state, queue depth) was planned but never built. Circuit-breaker and queue state are currently only observable through `/health`.

**Files** (as actually built — paths differ from the original plan):
- `backend/middleware/correlationId.js` — generates/propagates the correlation ID **and** performs structured request logging (the planned separate `requestLogger.js` was never created; the two concerns were merged here)
- `backend/config/logger.js` — pino logger setup (planned as `backend/utils/logger.js`)
- `backend/server.js` — `/health` handler is defined inline (planned as `backend/routes/health.js`, which does not exist)
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

## Phase 3: Multi-Domain Content Expansion ✅ (with deviations)

> Previously "Phase 2" in old plan. Deferred until infrastructure is solid.

Shipped, but the design diverged from the plan below. **The as-built approach folds MCQ and
design-doc content into the existing `Question` model rather than introducing separate
`Concept` / `DesignExercise` models and routes.** Original plan items and their real status:

1. ✅ (renamed) Added `domain` and `answerFormat` to the Question schema. The planned
   `mcqConfig` shipped as **`mcqOptions`**, and design content as **`designPrompt`**.
   No `topics` field was added — the pre-existing `group` and `list` fields serve that role.
2. ❌ **Not built.** `Concept` and `DesignExercise` models do not exist. Models are still
   `Question`, `User`, `UserProfile`, `SolveHistory`, `DailyRecommendationBatch`.
3. ❌ **Not built.** There is no `runJavaScriptCode()`. Frontend-domain questions are
   delivered as MCQ / design-doc formats, not as executable JS exercises.
4. ❌ **Not built.** No `concepts` or `design-exercises` routes. All domains are served by
   the existing `/api/v1/questions` routes, discriminated by `domain` + `answerFormat`.
5. ✅ Domain filtering implemented in `questionController.js`, `smartRecommendations.js`,
   and `solveHistory.js`.
6. ✅ Seed data for frontend + system design content (32 questions: 16 SD, 16 FE).
7. ⚠️ **Consolidated.** The planned `FrontendQuestions`, `SystemDesignQuestions`,
   `ConceptViewer`, and `DesignExerciseWorkspace` pages do not exist. A single
   `pages/AllQuestions.jsx` handles every domain via a `domain` prop, with
   `components/McqSolver/` and `components/DesignDocSolver/` rendering the non-code
   answer formats.
8. ✅ Navbar with domain navigation; guest-accessible clean routes `/algorithms`,
   `/system-design`, `/frontend`.

Also delivered beyond the plan: the full 5-strategy recommendation engine with
domain-weighted slot allocation, an MCQ validation endpoint, and ML-ready behavioral
signals (`userAction`, `timeToFirstAction`, `codeSubmissions`, `hintsUsed`, `wasRecommended`).

Full schema details preserved from original plan — see git history if needed.

---

## Architecture V2: Content/User Split ⬜ PROPOSED

**Supersedes the original sequencing of Phases 4 and 5.** Phase 4 as originally written
would have built learning paths on top of a schema that models System Design as solvable
questions — locking in a modelling error and forcing a second migration later. V2 pays
that debt down first, and Phase 4 then falls out nearly free.

Breaking changes are acceptable: cutover is a full dev→prod migration, not a rolling upgrade.

### Findings that motivate V2

Verified against running source, not docs.

1. **Everything is a `Question`.** One collection serves three unrelated shapes via
   `domain` + `answerFormat`. System Design (16 items, `design_doc`) is content to *read*,
   not a problem to *solve*, yet `/system-design` renders difficulty pills, a `0/5 solved`
   ring, and an Expand-All accordion. The schema is forcing the wrong product.
2. **Static content is stored as if dynamic.** Content already lives as versioned JSON in
   `backend/_data/` and is pushed to Mongo by `scripts/syncQuestionsFromJson.js`.
   `GET /api/v1/questions` returns **133 KB across 221 docs** — full HTML descriptions and
   example test cases — just to render a list. The 24 h cache TTL in `middleware/cache.js`
   is an admission the data is static.
3. **No home for teaching content.** There is no explanation/article/note field anywhere.
   `SolveHistory.note` is a user's *private* note — a different concept.
4. **Unbounded arrays.** `SolveHistory.solveHistory[]` and
   `UserProfile.adaptiveWeights.adjustmentHistory[]` grow without limit;
   `learningVelocity.weeklyHistory[]` is declared but never written (dead field). Only
   `recentPerformance.last10Questions[]` is capped. Write amplification grows with
   engagement, so the most valuable users degrade first.
5. **Recommendation engine does 16–25 sequential round-trips.**
   `controller/smartRecommendations.js` (1101 lines) passes an ever-growing
   `$nin: [solvedIds]` into every query, calls `countDocuments()` in a 3-iteration loop,
   runs up to 5 strategy queries per domain serially, and contains a true N+1
   (`Question.findById` inside a loop). Four `SolveHistory.find({userId})` calls lack
   projections; two add `.populate()`.
6. **Frontend doesn't match the domain model.** All three domains route into one
   `AllQuestions`; `CodeSandbox.jsx` (1504 lines) branches on `answerFormat` internally, so
   a page named *CodeSandbox* is also the article viewer. `Home.jsx` is a 102-line shell —
   no progress dashboard exists despite the "Learning Analytics" heading.

### Decision 1: Content leaves the database

Static content (questions, topic articles, test cases, prerequisites, notes) is authored in
`content/`, validated by Zod at build time, and compiled to content-hashed artifacts served
from Firebase Hosting alongside the JS bundle:

```
content/                          ← source of truth, in git
      │  npm run build:content    ← schema violation fails CI, not prod
      ▼
frontend/dist/content/
  index.<hash>.json               ← ~25 KB gz, list metadata only (target)
  items/<slug>.<hash>.json        ← full body, fetched on open
      ▼
Firebase Hosting · Cache-Control: public, max-age=31536000, immutable
```

**Rationale.** The content is single-author, identical for every user, changes on deploy
cadence, and has a read:write ratio around 100,000:1 — it is already code. Serving it from
Mongo buys no query flexibility (it is fetched wholesale and cached 24 h) while costing DB
capacity, a migration step per content edit, and a backend round-trip on the most common
page view.

**Cost consequence — the main prize.** Guest browse traffic (the majority of traffic to a
portfolio project) stops invoking the backend entirely: CDN edge hit, no Cloud Run cold
start, no DB read. Cloud Run stays scaled to zero for unauthenticated use.

**Rejected:** a CMS. Git already provides review, diff, blame, rollback and atomic deploys
for a single-author corpus.

### Decision 2: Split the content types

Replace the overloaded `Question` with three types sharing a common envelope
(`id`, `slug`, `domain`, `title`, `tags[]`, `order`):

| Type | Domain | Interaction | Progress semantics |
|---|---|---|---|
| `Problem` | algorithms, frontend | solve in sandbox | solved / attempted |
| `Quiz` | any | answer MCQ | correct / incorrect |
| **`Topic`** | system_design | **read + reflect** | **read / understood / needs-review** |

`Topic` carries `body` (MDX), `keyTakeaways[]`, `relatedProblems[]`, and critically
**`prerequisites[slug]`** — which *is* the Phase 4 learning-path graph. Building `Topic`
now means Phase 4 becomes a traversal over data that already exists.

Algorithms and Frontend are unchanged.

### Decision 3: Database — PostgreSQL (target), decision point at Step 6

**Status: committed but reversible.** Nothing in Steps 0–5 depends on this choice.

Once content leaves the database, 100% of what remains is uniform, per-user, transactional
data — there is no document-shaped data left. The codebase is already doing relational
modelling in a document engine: 5 collections with string foreign keys, `.populate()` as
client-side join emulation, a unique compound index standing in for a composite primary
key, and `$nin` shipping the join key over the wire to fake an anti-join.

Honest assessment of the margin:

- **Performance: a wash.** At this scale both engines are fast. The `$nin` and N+1 issues
  are fixable *in Mongo*. This is not the reason to move.
- **Migration cost: favors Mongo.** Staying eliminates the only irreversible step.
- **Transactional correctness: favors Postgres — and this is live, not theoretical.** A
  solve mutates `SolveHistory` + `UserProfile` + the recommendation batch, and the codebase
  uses **zero transactions** today.
- **Phase 4/5 are analytics features: favors Postgres.** Prerequisite chains are a
  recursive CTE; streaks are a window function; domain mastery is a `GROUP BY`. In Mongo
  these become application-level loops over fetched data.
- **Cost: favors Postgres.** Neon autosuspends to zero; Atlas paid tiers do not.

**Target stack:** Postgres 16 on **Neon** (autosuspend + database branching).
`session_context` and `adaptive_weights` become `JSONB` — flexibility retained exactly
where it is real. **Avoid Cloud SQL**: it does not scale to zero and carries a floor charge.
Cap the connection pool at 2–5 per Cloud Run instance and use a pooler; connection
exhaustion is the most common way Postgres-on-serverless fails.

`DailyRecommendationBatch` moves to **Redis** — it is a TTL'd cache and was never DB data.

### Decision 4: Normalise user progress

- **`attempts`** — immutable, append-only, one row per attempt. Partitionable by month.
- **`progress`** — one row per `(user_id, content_slug)`, holding only current state
  (`status`, `attempt_count`, `next_review_at`, `ease_factor`, `note`, `tags[]`).
- **`user_profile`** — computed scalars and capped windows only; history moves to `attempts`.

This eliminates the unbounded arrays structurally (they become rows), turns the `$nin`
exclusion into an indexed anti-join executed inside the database, and reduces spaced
repetition to a single indexed query on `(user_id, next_review_at)`.

`UserProfile.domainPreferences` currently hard-codes the three domains as schema keys, so a
fourth domain requires a migration. It becomes a keyed map, and the API returns
`progress: [{ domain, completed, total, streak }]` from day one — so the Home redesign
costs no schema work.

### Decision 5: Routing

```
/algorithms            list    (unchanged)
/algorithms/:slug      solve   (sandbox)
/frontend              list    (unchanged)
/frontend/:slug        solve   (sandbox / quiz)
/system-design         topic index — grouped by theme, no difficulty pills, no solved ring
/system-design/:slug   article reader — prose, diagrams, key takeaways
```

This also lets `CodeSandbox.jsx` shed its MCQ/design-doc branches and return to being a
code sandbox.

### Decision 6: Revert strategy — git, not a `/v2` API namespace

API versioning exists to serve consumers that cannot be upgraded in lockstep. There is
exactly one consumer — the frontend — deployed atomically with the backend. Running v1 and
v2 side by side would mean maintaining two data-access paths against two different
databases, reintroducing precisely the dual-write complexity that accepting a breaking
change removes.

Three layers of revert instead, all free:

| Layer | Mechanism | Rollback |
|---|---|---|
| Code | git branch → trunk | — |
| Runtime | **Cloud Run revisions** — deploy at 0% traffic, verify, shift to 100% | seconds |
| Data | **Neon database branching** | instant |

Caveat applying equally to all options: data written post-cutover does not exist in the old
store, so a true revert has a data cost regardless of mechanism.

### V2 execution order

Each step ships independently; nothing is broken in between. Steps 0–5 are
database-agnostic, so the Decision 3 commitment carries no sunk cost until Step 6.

| # | Step | Exit criteria |
|---|---|---|
| **0** | **Sandbox the Python executor** — container, no network, read-only FS, mem/CPU caps | ✅ **DONE** — arbitrary code cannot reach FS or network (see ADR-008) |
| 3 | Content pipeline — `content/` + Zod + `build:content` → hashed artifacts on CDN | artifacts build reproducibly; index < 30 KB gz; nothing consumes them yet |
| 4 | Frontend reads content from CDN; `/api/v1/questions` behind a flag for rollback | list view makes zero backend content calls |
| 5 | `Topic` + System Design reader | SD renders no difficulty pills and no solved ring |
| 6 | **Postgres schema + one-shot migration** (decision point) | per-user progress identical pre/post migration |
| 7 | Home dashboard + guided study | — |

Steps 1 and 2 from the interim analysis (optimize the Mongo engine in place; cap the
unbounded arrays) are **dropped**: both optimize code that Step 6 deletes. Retain them
*only* if Step 6 is deferred indefinitely.

**Naming:** the footer currently reads "RemindMe", and "PrepAlgo" understates a platform
now spanning algorithms, system design and frontend. Product name and domain should be
revisited during this rebuild — one breaking change rather than two. Independent of all
engineering work above; must not block Step 0.

---

## Phase 4: Guided Study System ⬜ NOT STARTED

Re-sequenced to follow Architecture V2 — see V2 execution order, Step 7. Building this
first would cement the System Design modelling error. After V2, `Topic.prerequisites[]`
supplies the path graph and `progress.next_review_at` supplies the scheduling, so most of
the feature is a traversal rather than new infrastructure.

1. LearningPath and UserLearningProgress models
2. Adaptive next-item logic with path-aware daily recommendations
3. Frontend: LearningPaths browse, LearningPathDetail timeline, LearningSession
4. "Continue Learning" card on Home page

## Phase 5: AI Review + Polish ⬜ NOT STARTED

None of the following exists in the codebase yet.

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

### Architecture V2

| Step | Component | Effort | Staff Signal |
|------|-----------|--------|-------------|
| **0** | Sandbox Python executor | 1.5 days | Security isolation — highest open risk |
| **3** | Content pipeline (Zod + hashed artifacts) | 2 days | Build-time validation, content-as-code |
| **4** | Frontend reads content from CDN | 1.5 days | Edge caching, backend scales to zero on browse |
| **5** | `Topic` model + System Design reader | 3 days | Correcting a domain-modelling error |
| **6** | Postgres schema + migration | 3 days | Storage engine selection, transactional correctness |
| **7** | Home dashboard + guided study | 3 days | Recursive CTEs, window functions |

**Total V2: ~14 days.** Steps 0–5 (~8 days) are database-agnostic and can begin immediately.

---

## Verification Plan

- **2a**: Auth middleware rejects unauthenticated requests. Redis cache survives cold start. Rate limiter shared across instances (test with 2 Cloud Run instances). Cache stampede test with concurrent requests.
- **2b**: Code execution returns via job polling. Circuit breaker opens on DB kill, serves stale cache. Correlation IDs trace through logs.
- **2c**: Gateway routes to correct service. Code execution sandboxed (can't access filesystem/network). CDN serves cached assets with correct headers.
- **V2.0**: ✅ Executor cannot open a socket, read outside its jail, or exceed its memory cap.
  Verified by 75 tests (`backend/tests/sandbox.test.js`, `codeExecution.test.js`) covering
  network, filesystem, process-spawn and syscall escapes, resource limits, guard-prologue
  composition, Docker isolation flags, and the end-to-end grading path. Subprocess mode was
  exercised live; Docker mode is asserted at the argument level only and still owes a live
  container run before production reliance.
- **V2.3**: Malformed content fails CI. Artifacts are byte-identical across repeated builds.
- **V2.4**: Loading `/algorithms` as a guest issues zero requests to Cloud Run.
- **V2.5**: `/system-design` renders no difficulty pills and no solved ring.
- **V2.6**: Per-user progress counts identical pre/post migration. Pool holds under a
  simulated Cloud Run scale-out.

**Backward compatibility**: Every Phase 2 sub-phase deployable independently. V2 Steps 0–5
are additive and independently deployable; **Step 6 is an intentional breaking change**
delivered as a full dev→prod cutover, with rollback via Cloud Run revisions and Neon
database branches rather than a parallel `/v2` API.
