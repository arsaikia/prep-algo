# ADR 007: Structured Logging and Observability

## Status
Accepted (amended)

Health is now split: `/health/live` (no dependency calls), `/health/ready`
(explicit PostgreSQL/Redis check, used sparingly so Neon can sleep) and
`/health` (component status including PostgreSQL pool utilization and breaker
state, Redis and execution load). MongoDB and BullMQ entries below are
historical; both were removed, and `/health` no longer reports a queue.

## Context
All logging used `console.log/error/warn` with emoji prefixes and unstructured string output. No correlation between related log entries across a request lifecycle. No structured data for log aggregation in Cloud Run / GCP Logging. Health check returned a static `{ status: 'ok' }` with no dependency verification.

## Decision

### Structured Logging with pino
Replace all `console.*` calls with **pino**, the fastest Node.js structured logger. Configuration:
- Production: JSON output to stdout (Cloud Run / GCP Logging compatible)
- Development: Pretty-printed output via `pino-pretty`
- Base fields: `service`, `env`
- Log levels: `info` (production), `debug` (development)

### Correlation IDs
New middleware generates a UUID per request (or accepts incoming `X-Correlation-ID` header). Creates a pino child logger on `req.log` with the correlation ID, HTTP method, and URL. All downstream logging uses this child logger for automatic correlation.

This middleware also replaces the previous `performance.js` middleware — it logs request completion with duration and warns on slow requests (>500ms).

### Deep Health Check
`GET /health` now returns component-level status:
- MongoDB connection state + circuit breaker state
- Redis availability
- BullMQ queue stats (waiting, active, completed, failed)
- Overall status: `ok` | `degraded` (optional deps down) | `unhealthy` (core deps down, returns 503)

## Alternatives Considered
- **winston**: More popular but significantly slower than pino. JSON output requires configuration.
- **bunyan**: Predecessor to pino, less actively maintained.
- **Morgan**: HTTP request logger only, doesn't replace application logging.

## Consequences
- All logs are structured JSON in production, enabling filtering and aggregation.
- Correlation IDs trace requests across log entries.
- Health check enables load balancer and monitoring integration.
- `pino-pretty` dev dependency provides readable development output.
- ~100 `console.*` calls replaced across runtime code (scripts left unchanged).
