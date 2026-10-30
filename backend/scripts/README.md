# Backend scripts

Run from the repository root with `npm --prefix backend run <script>`. Scripts
read `backend/.env`; point `DATABASE_URL` at the intended environment.

| npm script | File | Purpose |
| --- | --- | --- |
| `db:check` | `checkPostgres.js` | Verify connectivity, TLS and schema state (no writes) |
| `db:migrate` | `migratePostgres.js` | Apply pending SQL migrations (explicit step before deploy) |
| `db:migrate:status` | `migratePostgres.js --status` | List applied/pending migrations |

Migration and backup procedures are in
[DEPLOYMENT_README.md](../../DEPLOYMENT_README.md#database-migrations-and-backups).
Content is managed in `content/` and compiled by `npm run build:content`.
Recommendation coverage lives in `npm --prefix backend test`.
