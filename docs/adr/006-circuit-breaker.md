# ADR 006: Circuit Breaker Pattern

## Status
Accepted (amended for PostgreSQL)

The database breaker is now `postgresCircuitBreaker` in
`backend/config/circuitBreakers.js` (same thresholds) and opens only on
network-level connection failures, not statement errors. Mongo/mongoose
references below are historical.

## Context
MongoDB outages or external API failures (Google OAuth) cause cascading request failures with slow timeouts. Without circuit breaking, every request during an outage waits for the full timeout before failing, exhausting connection pools and degrading the entire service.

## Decision
Implement a custom **three-state circuit breaker** (CLOSED → OPEN → HALF_OPEN → CLOSED) as a lightweight utility class.

Two named instances:
- `mongoCircuitBreaker`: wraps database queries (threshold: 5 failures, reset: 30s)
- `externalApiCircuitBreaker`: wraps Google OAuth verification (threshold: 3 failures, reset: 60s)

When open, requests fail fast with a 503 status code. State transitions are logged via pino for observability. Circuit breaker stats are exposed in the `/health` endpoint.

### Design
- Initial `mongoose.connect()` is NOT wrapped (startup failure should be fatal).
- Only ongoing queries are protected.
- The `CircuitBreakerOpenError` carries `statusCode: 503` for automatic HTTP status mapping.

## Alternatives Considered
- **opossum**: Full-featured circuit breaker library. Rejected because the implementation is ~90 lines and adding a dependency for this is unnecessary overhead.
- **cockatiel**: TypeScript-first, good API. Rejected for same reason — custom is simpler for our needs.

## Consequences
- Failed dependencies are detected within 5 consecutive errors and requests fail fast.
- Half-open state allows automatic recovery testing.
- Health check provides real-time circuit breaker visibility.
- No external dependency added.
