# ADR-001: JWT Auth Middleware

## Status: Accepted

## Context
All API routes were publicly accessible. Anyone with a userId could read/write another user's solve history, recommendations, and profile data. JWT tokens were generated on login but never verified on subsequent requests.

## Decision
Add JWT verification middleware (`backend/middleware/auth.js`) that:
- Extracts Bearer token from Authorization header
- Verifies token signature and expiry using `jsonwebtoken`
- Attaches decoded user to `req.user`
- Returns 401 for missing/invalid/expired tokens

Route classification:
- **Public**: `GET /questions`, `GET /questions/:id`, `POST /auth/google`, `GET /health`
- **Protected**: All write operations, user-specific reads (solve history, recommendations, user progress)

Frontend sends token via axios interceptor (`frontend/src/api/client.js`) reading from `authToken` cookie.

## Alternatives Considered
- **Passport.js**: Adds unnecessary abstraction for a single auth strategy (JWT). Direct `jsonwebtoken` is simpler and more transparent.
- **Session-based auth**: Doesn't work well with stateless Cloud Run instances. JWT is self-contained.

## Consequences
**Positive**: API routes properly secured. User data isolated. Foundation for role-based access.
**Negative**: Every protected request adds ~1-2ms for JWT verification + user lookup. User lookup is cached (30min TTL via cache middleware on auth route).

## Implementation Notes
- `backend/middleware/auth.js` — middleware
- `backend/server.js` — `protect` applied to route groups
- `frontend/src/api/client.js` — axios instance with auth interceptor
- All frontend API files migrated from raw `axios`/`fetch` to shared `apiClient`
