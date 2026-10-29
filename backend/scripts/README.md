# Backend scripts

Run from the repository root with `npm --prefix backend run <script>`. Scripts
read `backend/.env`; point `DATABASE_URL` at the intended environment.

| npm script | File | Purpose |
| --- | --- | --- |
| `db:check` | `checkPostgres.js` | Verify connectivity, TLS and schema state |
| `db:migrate` | `migratePostgres.js` | Apply pending SQL migrations (explicit step before deploy) |
| `db:migrate:status` | `migratePostgres.js --status` | List applied/pending migrations |
| `db:import-mongo` | `importMongoToPostgres.js` | Import legacy Mongo testing data. Dry run by default; `-- --apply` commits. Requires `IMPORT_MONGO_URI` |
| `validate-recommendations[:verbose]` | `validateRecommendationEngine.js` | Legacy smoke check (below) |

Procedures and safeguards for migration and import are in
[docs/POSTGRES_MIGRATION.md](../../docs/POSTGRES_MIGRATION.md).

## Legacy validator

`validateRecommendationEngine.js` predates JWT ownership checks: it sends no
token, defaults `API_BASE_URL` to `http://localhost:5005/api/v1` (local dev uses
5000), and also calls the removed `/solveHistory/:id/daily-recommendations` route
and `forceRefresh`. Expect failures against the current API; use
`npm --prefix backend test` for recommendation coverage.

## Retired Mongo scripts

These files now only throw via `retiredMongoScript.js`; content is managed in
`content/` and compiled by `npm run build:content`:
`backfillSolveHistoryFields`, `cleanupDevDatabase`, `createTestUsers`,
`deleteQuestionsByGroup`, `exportContentToFiles`, `migrateToMultiDomain`,
`syncQuestionsFromJson`, `testProblemSubmissions`.
