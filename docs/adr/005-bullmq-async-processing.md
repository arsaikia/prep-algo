# ADR 005: BullMQ Async Code Execution

## Status
Accepted

## Context
Code execution routes (`POST /execute/example`, `/execute/submit`) run user Python code synchronously via `child_process.spawn`, blocking the Express request handler for up to 5 seconds per test case. Under load, this saturates the event loop and limits throughput.

## Decision
Use **BullMQ** (Redis-backed) to process code execution jobs asynchronously. The route handler enqueues a job and waits for completion via `job.waitUntilFinished()` with a 15-second timeout, keeping the API contract unchanged (synchronous response to the client).

A dedicated Worker runs in the same process with concurrency of 2, matching the code execution rate limiter (~10/min). BullMQ uses its own Redis connections with `maxRetriesPerRequest: null` (required by BullMQ), separate from the shared ioredis client.

### Graceful Degradation
When Redis is unavailable, code execution falls back to direct `runPythonCode()` calls (pre-existing behavior). No API change for the frontend.

## Alternatives Considered
- **Agenda**: MongoDB-backed, but adds latency for job polling and doesn't support real-time job completion events.
- **Bee-Queue**: Lighter than BullMQ but less actively maintained and missing `waitUntilFinished`.
- **Direct Redis pub/sub**: Too low-level; would reimplement most of BullMQ's job lifecycle management.
- **Separate worker process**: Better isolation, but adds deployment complexity. Can be adopted later if memory pressure warrants it.

## Consequences
- Code execution is decoupled from request handling, improving event loop utilization.
- BullMQ adds ~10-50ms overhead per job vs. direct execution (acceptable for multi-second code runs).
- Redis becomes a soft dependency for code execution (graceful fallback exists).
- Worker concurrency is configurable for future tuning.
