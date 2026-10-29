# PostgreSQL setup and MongoDB cutover

The runtime uses Neon PostgreSQL for users, attempts, progress, profiles, and
recommendation assignments. Redis remains optional cache/rate-limit infrastructure.
Public content stays on Firebase Hosting; grading keys stay in backend bundles.

## Local configuration

Install backend dependencies with `npm ci --prefix backend`, and build content with
`npm run build:content`. Put a pooled Neon **development** connection in the ignored
`backend/.env` as `DATABASE_URL`, preserving the TLS parameters from Neon. Put the
development Redis TLS URL in `REDIS_URL`. Never put either in frontend variables.

Until real-user onboarding, the current shared Neon database is explicitly
testing data. Separate development and production databases and credentials
before onboarding real users. Use the
pooled URL for the runtime, a bounded per-instance pool, and a Cloud Run maximum
instance count consistent with the database connection budget. A separate direct
connection may be used for administrative migrations.

## Initialize and preserve existing testing data

1. Run `npm --prefix backend run db:check` to verify connectivity without writes.
2. Run `npm --prefix backend run db:migrate` to apply versioned SQL migrations and
   synchronize content identities from the built catalog.
3. Set `IMPORT_MONGO_URI` explicitly to the source used by the existing app. Do not
   guess from `NODE_ENV`; historically the development and production Mongo settings
   have pointed at the same database.
4. Run `npm --prefix backend run db:import-mongo` for the default dry run. Inspect
   counts and orphan warnings before applying.
5. Run `npm --prefix backend run db:import-mongo -- --apply`. The importer preserves
   existing user IDs (including synthetic test IDs), history and profile data.
   Do not delete the Mongo source. Re-running must not duplicate imported attempts.
6. Start `npm --prefix backend start` and `npm --prefix frontend run dev`. The Vite
   proxy expects the backend on port 5000; set `PORT=5000` in the backend environment.

Do not run the old Mongo cleanup, seed, content-sync, or backfill scripts against the
new runtime. Existing testing accounts are preserved by the importer, not recreated
through Google sign-in. Test tokens must stay local and must never be logged.

## Submission and API semantics

The authenticated code and MCQ grading endpoints record both successful and failed
attempts. A short PostgreSQL transaction appends the attempt, updates progress and
completes matching daily assignments on a pass. Failed attempts never increment the
solve count. The client supplies a UUID `submissionId` and reuses it on network
retries; reusing a key with different content or payload returns 409. Grading occurs
outside the transaction. Clients without a key receive a fresh server-generated key
and cannot rely on retry deduplication.

Stable catalog IDs and existing HTTP response identifiers are preserved.
`POST /api/v1/solveHistory` accepts annotations (`note`, `tags`, `difficultyRating`)
only, not client declarations of successful solves. History is paginated with
`limit` (1–100, default 100) and `offset` (default 0); each content entry includes
at most its 20 latest attempts. Older attempts remain stored in PostgreSQL.

## Production

The prepared candidate uses the keyless service account
`prepalgo-api@prepalgo.iam.gserviceaccount.com`, with Secret Accessor granted
only on `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` and `GOOGLE_CLIENT_ID`.
Its executor caller allowlist is restricted to that identity; the candidate
removes obsolete Mongo secret mounts. These changes do not alter the old
revision's identity or production traffic.

Attach a numeric version of the `DATABASE_URL` Secret Manager secret to Cloud Run.
The runtime service account needs Secret Manager Secret Accessor on that secret.
Use a migration-capable credential only for initialization; provision a restricted
application role for normal runtime queries.

Apply migrations and import the desired existing testing data before deploying the
new backend. Deploy at zero traffic using `./deploy-to-cloudrun.sh`, which updates
the `candidate` tag. Check `/health/ready`, sign-in/ownership, progress, code and MCQ
submissions, and daily recommendations before `./deploy-to-cloudrun.sh --promote EXACT_REVISION`.
Deploy the matching frontend to enable retry-safe submission IDs.

Routine liveness should not run SQL that continually wakes a sleeping Neon compute.
Readiness performs an explicit dependency check. Colocated BullMQ execution is
retired; `CODE_EXECUTION_QUEUE=bullmq` fails startup rather than adding an unbounded
second queue.

MongoDB is not dual-written. Rolling back to the old revision will not contain new
PostgreSQL activity. Keep the source database intact and treat deletion as a separate,
explicitly approved action. Once real users write to PostgreSQL, rollback requires
preserving/reconciling those writes, not just changing traffic.

## Verified testing backup (2026-10-28)

Before deploying the PostgreSQL candidate, a custom-format `pg_dump` was made
from an exported, repeatable-read snapshot using PostgreSQL 18 tools matching
the Neon server major version. Only application `public` schema objects/data
were included, without provider ownership or ACLs. The archive was restored
with `pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl`
into an ephemeral, network-disabled local PostgreSQL 18 container.

All 11 public tables matched the snapshot's row counts and ordered row digests,
including 10 users, 1,028 attempts and 341 progress rows. The temporary restore
container was removed. The mode-0600 dump and receipt are outside the repository
under this session's `files/postgres-backup-20261028/`; the receipt identifies
the verified archive by filename and SHA-256. No backup or credentials are
committed. This is a local, unencrypted, point-in-time application-data backup,
not an off-device backup, provider-role backup or recurring recovery policy.
Keep it on trusted storage and establish recurring/off-device recovery before
real-user onboarding.

## Hosted candidate acceptance (2026-10-28)

Revision `prep-algo-backend-00049-das` was deployed with zero live traffic,
the dedicated API identity, private executor networking and the explicit public
trust certificate. PostgreSQL and Redis reported healthy. Hosted requests
verified JWT/ownership isolation, migrated-account progress reads, actual
Python grading through Google OIDC/private TLS, code/quiz progress persistence,
retry deduplication/conflict rejection and stable daily initialization.
Temporary acceptance account/data were removed afterward.

The initial candidate exposed an upload issue: `*.pem` is excluded by the
deployment ignore policy. The **public** trust certificate now uses `.crt`
and its inclusion was checked with `gcloud meta list-files-for-upload`;
private keys remain excluded. No TLS verification bypass was used.

Acceptance used short-lived locally signed application JWTs, not browser Google
sign-in. A follow-up manual pass with a local frontend pointed at the candidate
verified real Google sign-in, coding execution and submission
(`majority-element`), system-design quiz submission
(`caching-strategies-deep-dive`), and recommendation tracking. All requests
returned 200, and both attempts and their progress rows persisted in PostgreSQL.
Keep the existing source database and do not treat the pre-migration Mongo
revision (`00045-5fk`) as a write-preserving rollback after PostgreSQL cutover.

## Production cutover (2026-10-29)

Before cutover, Cloud Run request logs showed zero writes to the Mongo
revision in 30 days, and a fresh pre-cutover PostgreSQL backup passed restore
verification (table counts and row digests). Candidate
`prep-algo-backend-00051-qow` (schema label `002`) passed hosted acceptance and
now serves 100% of traffic. The frontend was released with the first-inventory
bootstrap (`HOSTING_BOOTSTRAP=1`); old hashed assets still resolve, unknown
assets return 404, and frontend/backend content revisions match. Failure
response is `maintenance.mjs on` and fix forward (see `DEPLOYMENT_README.md`
"Rollback").

## Follow-up correctness and scale changes

Migration `002_timing_and_history.sql` adds the timed-success observation count,
recent-history indexes, and the catalog release marker. Apply it with
`npm --prefix backend run db:migrate` before restarting the app. Startup checks
pending migrations and refuses an outdated schema. It tolerates applied migrations
newer than the release so rollback works; new migrations must follow the
expand/contract rule in [DEPLOYMENT_README.md](../DEPLOYMENT_README.md#rollback).

`timeTaken` on authenticated code/MCQ submissions is optional, untrusted elapsed
**seconds**, bounded to 0–86,400. It is included in the idempotency hash, so clients
must retry the original frozen payload. Successful timed attempts update the
running average; untimed and failed attempts do not distort it. A legacy average
is retained as one prior observation. An optional `contentRevision` binds a
submission to its displayed question, including private grading changes; a
mismatch returns 409 before execution/persistence. Legacy clients omitting it are
temporarily supported, not guaranteed cross-release compatibility.

`solveCount` means successful submissions; `attemptCount` means all recorded
submissions. Recommendation struggle/mastery heuristics use attempts, not repeat
successes. Legacy imported counters are preserved rather than rewritten based on
ambiguous old semantics. Daily activity is derived from successful attempt events,
not overwritten latest-solve timestamps. Daily assignments, expiry, streaks and
time-of-day buckets consistently use **UTC**, not the server's locale. Streaks
remain current through yesterday until the learner has had today's opportunity.

GET daily initializes a missing assignment idempotently but never silently
replaces an existing one. GET `forceRefresh=true` is rejected; use the existing
POST refresh endpoint, which enforces refresh eligibility. Analytics are refreshed
without changing the assignment. First-profile initialization shares the same
user-row serialization as attempts. Recommendation item writes are bulked.

History supports `nextCursor`/`cursor` for keyset pagination; do not combine cursor
and offset. Offset remains compatible for existing clients. Each page retrieves
only the latest 20 indexed events per selected content item. Ordering is live,
not a point-in-time snapshot across concurrent updates.

Public content uses a bounded process-local cache; private routes remain
`no-store`. No user cache invalidation or global Redis key scans occur on saves.
Redis remains for rate limits, whose fallback is explicitly per-instance.

Before production promotion, document the actual Neon region/tier/pooled client
limit and direct server limit. Five pool clients × ten API instances = up to
50 application clients **before** candidates, rollout overlap, tests, and admin
sessions. Reserve headroom; do not assume the provider's free tier fits this.
Health exposes pool utilization; slow transactions log total/pool-wait durations.
Unchanged catalog digests skip startup synchronization; changed catalogs retain
transaction-scoped advisory locking. Restrict routine SQL readiness polling so
Neon can sleep.
