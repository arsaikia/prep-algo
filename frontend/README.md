# PrepAlgo Frontend

React 18 + Vite single-page app, deployed to Firebase Hosting.

## Development

```bash
npm ci
cp .env.example .env
npm run dev          # http://localhost:5173
```

Vite proxies `/api/v1` to `http://localhost:5000`, so run the backend with
`PORT=5000`. Questions and articles are compiled from the repository's
`content/` directory; run `npm run build:content` at the repository root first.

| Script | Purpose |
| --- | --- |
| `dev` / `start` | Vite dev server |
| `build` | Production build to `build/` |
| `preview` | Serve the production build locally |
| `lint`, `lint:fix` | ESLint over `src/` |
| `test:regression` | Node regression tests in `tests/` |
| `clean` | Remove `build/` |

## Environment

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URI` | API base, e.g. `http://localhost:5000/api/v1` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client; the page origin must be an authorized JavaScript origin |
| `VITE_CONTENT_SOURCE` | `cdn` (default, static compiled content) or `api` (legacy fallback) |

Release builds get `frontend/.env.production` from `deploy-to-firebase.sh`; see
[DEPLOYMENT_README.md](../DEPLOYMENT_README.md).

## Dev mode

A `devMode=1` cookie (`src/utils/featureFlags.js`) enables the test-user
selector, debug logging, performance metrics and experimental features. It is a
client-side UI switch, not an authorization mechanism; the API enforces access.

```js
document.cookie = 'devMode=1; path=/'; location.reload();                                   // on
document.cookie = 'devMode=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'; location.reload(); // off
```
