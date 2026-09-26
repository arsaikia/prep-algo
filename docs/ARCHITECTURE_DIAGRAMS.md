# PrepAlgo — Architecture Evolution Diagrams

Visual reference for each phase of the architecture. All diagrams use Mermaid.

---

## Phase 1: Monolith (Baseline)

```mermaid
graph TB
    subgraph Client
        Browser["React SPA<br/>(Vite + Redux)"]
    end

    subgraph Firebase["Firebase Hosting"]
        CDN["Static Assets"]
    end

    subgraph CloudRun["Cloud Run"]
        Express["Express Monolith"]
        InMemCache["node-cache<br/>(in-memory)"]
        InMemRL["express-rate-limit<br/>(in-memory)"]
        CodeExec["child_process.spawn<br/>(Python3, no sandbox)"]
    end

    subgraph Cloud
        MongoDB["MongoDB Atlas"]
    end

    Browser -->|HTTPS| CDN
    Browser -->|API calls| Express
    Express --> InMemCache
    Express --> InMemRL
    Express --> CodeExec
    Express --> MongoDB

    style InMemCache fill:#e74c3c,color:#fff
    style InMemRL fill:#e74c3c,color:#fff
    style CodeExec fill:#e74c3c,color:#fff
```

**Problems**: In-memory cache/rate limiter reset on cold start, not shared across instances. No auth middleware. Code execution blocks request thread. No observability.

---

## Phase 2a: Security + Redis Foundation (Complete)

```mermaid
graph TB
    subgraph Client
        Browser["React SPA<br/>(Vite + Redux)"]
    end

    subgraph Firebase["Firebase Hosting"]
        CDN["Static Assets"]
    end

    subgraph CloudRun["Cloud Run"]
        Express["Express Monolith"]

        subgraph Middleware
            JWT["JWT Auth<br/>Middleware"]
            RLMiddleware["Rate Limiter<br/>(Sliding Window +<br/>Token Bucket)"]
            CacheMiddleware["Cache Middleware<br/>(Write-through +<br/>Cache-aside)"]
        end

        CodeExec["child_process.spawn<br/>(Python3)"]
    end

    subgraph Cloud
        MongoDB["MongoDB Atlas"]
        Redis["Upstash Redis<br/>(TLS, shared)"]
    end

    Browser -->|HTTPS| CDN
    Browser -->|API + JWT| Express
    Express --> JWT
    JWT --> RLMiddleware
    RLMiddleware --> CacheMiddleware
    CacheMiddleware --> CodeExec
    Express --> MongoDB
    RLMiddleware -.->|Lua scripts<br/>atomic ops| Redis
    CacheMiddleware -.->|TTL tiers<br/>stampede lock| Redis

    style JWT fill:#27ae60,color:#fff
    style RLMiddleware fill:#27ae60,color:#fff
    style CacheMiddleware fill:#27ae60,color:#fff
    style Redis fill:#2980b9,color:#fff
```

**What changed**: Google OAuth + JWT auth on all protected routes. Redis replaces in-memory cache and rate limiter. Sliding window (API) + token bucket (code exec) rate limiting with Lua scripts. Write-through + cache-aside patterns with stampede protection.

**ADRs**: 001-auth, 002-redis, 003-rate-limiter, 004-caching

---

## Phase 2b: Async Processing + Resilience (Complete)

```mermaid
graph TB
    subgraph Client
        Browser["React SPA<br/>(Vite + Redux)"]
    end

    subgraph Firebase["Firebase Hosting"]
        CDN["Static Assets"]
    end

    subgraph CloudRun["Cloud Run"]
        subgraph RequestPipeline
            CorrID["Correlation ID<br/>Middleware"]
            JWT["JWT Auth"]
            RL["Rate Limiter"]
            Cache["Cache"]
        end

        subgraph Resilience
            CB_Mongo["Circuit Breaker<br/>(MongoDB)"]
            CB_External["Circuit Breaker<br/>(External APIs)"]
        end

        subgraph Observability
            Pino["Pino Logger<br/>(JSON structured)"]
            HealthCheck["Deep Health<br/>GET /health"]
        end

        Routes["Route Handlers"]
    end

    subgraph Workers["BullMQ Worker (same process)"]
        Worker["Code Execution<br/>Worker (concurrency: 2)"]
    end

    subgraph Cloud
        MongoDB["MongoDB Atlas"]
        Redis["Upstash Redis<br/>(TLS)"]
        subgraph RedisUsage["Redis Responsibilities"]
            R_Cache["Cache"]
            R_RL["Rate Limits"]
            R_Queue["BullMQ Queue"]
        end
    end

    Browser -->|HTTPS| CDN
    Browser -->|API + JWT| CorrID
    CorrID --> JWT --> RL --> Cache --> Routes

    Routes -->|code submit| Redis
    Redis -->|job pickup| Worker
    Worker -->|result| Redis
    Routes -->|poll result| Redis

    Routes -->|DB queries| CB_Mongo --> MongoDB
    Routes -->|OAuth verify| CB_External

    Routes --> Pino
    HealthCheck -->|component status| MongoDB
    HealthCheck -->|component status| Redis

    Redis --- R_Cache
    Redis --- R_RL
    Redis --- R_Queue

    style CorrID fill:#8e44ad,color:#fff
    style Pino fill:#8e44ad,color:#fff
    style HealthCheck fill:#8e44ad,color:#fff
    style CB_Mongo fill:#e67e22,color:#fff
    style CB_External fill:#e67e22,color:#fff
    style Worker fill:#2980b9,color:#fff
```

**What changed**: BullMQ async code execution (graceful fallback to direct when Redis down). Custom three-state circuit breakers on MongoDB and external APIs. Pino structured logging with correlation IDs. Deep health check with component-level status.

**ADRs**: 005-bullmq, 006-circuit-breaker, 007-observability

---

## Phase 2c: Gateway + Service Extraction (Planned)

```mermaid
graph TB
    subgraph Client
        Browser["React SPA"]
    end

    subgraph Edge
        CDN["Cloudflare / Firebase CDN"]
    end

    subgraph Gateway["API Gateway (Cloud Run)"]
        GW_CORS["CORS"]
        GW_CorrID["Correlation ID"]
        GW_Auth["Auth"]
        GW_RL["Rate Limit"]
        GW_Route["Router"]
    end

    subgraph Services
        MainAPI["Main API Service<br/>(Cloud Run)"]
        CodeSvc["Code Execution Service<br/>(Cloud Run, sandboxed)"]
    end

    subgraph Cloud
        MongoDB["MongoDB Atlas"]
        Redis["Upstash Redis"]
    end

    Browser --> CDN
    CDN --> Gateway
    GW_CORS --> GW_CorrID --> GW_Auth --> GW_RL --> GW_Route

    GW_Route -->|/api/*| MainAPI
    GW_Route -->|/code/*| CodeSvc

    MainAPI --> MongoDB
    MainAPI --> Redis
    CodeSvc --> Redis

    style Gateway fill:#2c3e50,color:#fff
    style CodeSvc fill:#c0392b,color:#fff
```

---

## Target State (All Phases)

```mermaid
graph TB
    subgraph Client
        Browser["React SPA<br/>+ Service Worker"]
    end

    subgraph Edge
        CDN["CDN<br/>(immutable assets,<br/>proper Cache-Control)"]
    end

    subgraph Gateway["API Gateway"]
        direction LR
        Auth["Auth + API Keys"]
        RL["Rate Limit"]
        Route["Router"]
    end

    subgraph Services
        MainAPI["Main API<br/>(questions, recs,<br/>user data)"]
        CodeSvc["Code Execution<br/>(sandboxed Docker/<br/>gVisor)"]
        AI["AI Review Service<br/>(Claude API)"]
    end

    subgraph Data
        MongoDB["MongoDB Atlas"]
        Redis["Redis<br/>(cache, queue,<br/>rate limits,<br/>circuit state)"]
    end

    subgraph Observability
        Logs["Structured Logs<br/>(GCP Cloud Logging)"]
        Health["Health Checks<br/>(per-service)"]
    end

    Browser --> CDN --> Gateway
    Auth --> RL --> Route
    Route --> MainAPI
    Route --> CodeSvc
    Route --> AI

    MainAPI --> MongoDB
    MainAPI --> Redis
    CodeSvc --> Redis
    AI --> Redis

    MainAPI --> Logs
    CodeSvc --> Logs
    Gateway --> Logs
    MainAPI --> Health

    style Gateway fill:#2c3e50,color:#fff
    style AI fill:#9b59b6,color:#fff
```

---

## Request Flow: Code Execution (Phase 2b)

```mermaid
sequenceDiagram
    participant U as User
    participant E as Express
    participant CB as Circuit Breaker
    participant Q as BullMQ Queue
    participant W as Worker
    participant R as Redis

    U->>E: POST /code/execute
    Note over E: Correlation ID assigned
    E->>E: JWT verify + rate limit check

    alt Redis available
        E->>Q: Add job to queue
        Q->>R: Store job
        R->>W: Worker picks up job
        W->>W: runPythonCode()
        W->>R: Store result
        E->>R: waitUntilFinished (15s timeout)
        R->>E: Job result
    else Redis unavailable
        E->>E: Direct runPythonCode()
    end

    E->>U: { output, results }
    Note over E: Log duration, status, correlation ID
```

---

## Circuit Breaker State Machine

```mermaid
stateDiagram-v2
    [*] --> CLOSED

    CLOSED --> OPEN: failure count >= threshold
    CLOSED --> CLOSED: success (reset counter)

    OPEN --> HALF_OPEN: resetTimeout elapsed

    HALF_OPEN --> CLOSED: probe succeeds
    HALF_OPEN --> OPEN: probe fails

    note right of CLOSED: Normal operation<br/>Track consecutive failures
    note right of OPEN: All requests fail fast<br/>Return 503
    note right of HALF_OPEN: Allow 1 probe request<br/>Decide next state
```

---

## Cost Efficiency Notes

| Component | Cost Strategy |
|-----------|--------------|
| **Upstash Redis** | Pay-per-command. BullMQ connections use dedicated config (maxRetriesPerRequest: null). Job retention: 10 completed, 10 failed — minimizes Redis memory |
| **Pino Logging** | `info` level in prod (no debug logs shipped). GCP Cloud Logging auto-ingests JSON from stdout — no extra agent or service |
| **Circuit Breaker** | Pure in-memory state machine. Zero external calls for state tracking |
| **BullMQ Worker** | Runs in-process (no separate Cloud Run service). Concurrency: 2 — limits memory without needing extra instances |
| **MongoDB Atlas** | Compound indexes + denormalized fields reduce query count. Circuit breaker prevents wasted retries during outage |
| **Cloud Run** | Min instances: 0 (scale to zero when idle). Graceful degradation means partial Redis outage doesn't force scaling |
