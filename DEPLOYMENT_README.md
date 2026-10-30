# Deployment and Release Runbook

Authoritative operations guide: backend (Google Cloud Run), frontend (Firebase
Hosting), private executor, cost guard and rollback. Architecture context is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Prerequisites

### Backend (Google Cloud Run)
- Google Cloud SDK installed and configured
- No local Docker needed: images build in Cloud Build (`gcloud builds submit`)
- Access to Google Cloud project `prepalgo`
- Secrets configured in Google Secret Manager

### Frontend (Firebase Hosting)
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project access: `firebase login`

## Deployment Scripts

### Backend: `deploy-to-cloudrun.sh`

Builds content, lints migrations, builds the image in Cloud Build and deploys a
**zero-traffic** candidate, then smoke-tests it.

```bash
./deploy-to-cloudrun.sh                      # deploy candidate (0% traffic)
./deploy-to-cloudrun.sh --promote REVISION   # move 100% to the exact tested candidate
./deploy-to-cloudrun.sh --rollback REVISION  # guarded traffic-only rollback
```

### Frontend: `deploy-to-firebase.sh`

Full deployment with build validation, environment setup, and verification.

```bash
./deploy-to-firebase.sh
```

## Environment Configuration

### Backend Secrets (Google Secret Manager)
- `DATABASE_URL` (Neon pooled PostgreSQL connection, with TLS)
- `REDIS_URL` (optional Upstash TLS connection)
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`

The candidate build removes any legacy `MONGO_URI`/`MONGO_URI_DEV` secret
mounts (`backend/cloudbuild.yaml`); the backend has no MongoDB code.

### Database migrations and backups

PostgreSQL schema migrations are applied explicitly, never by Cloud Run
instances. Startup refuses pending migrations. With `DATABASE_URL` pointing at
the intended database (a direct, migration-capable connection is fine):

```bash
npm --prefix backend run db:check            # connectivity, TLS, schema state (no writes)
npm --prefix backend run db:migrate:status   # applied / pending
npm --prefix backend run db:migrate          # apply pending + sync content identities
```

Before any migration or risky release, take a logical backup and verify it:
custom-format `pg_dump` of the `public` schema from a repeatable-read snapshot
with PostgreSQL tools matching the Neon major version (pinned
`postgres:18-alpine`), restore it with
`pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl` into an
ephemeral, network-disabled local container, and compare table row counts and
ordered row digests. Keep the archive (mode 0600) outside the repository on
trusted storage. This is a manual point-in-time backup only; recurring,
off-device backups are an open item (see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#open-items)). The 2026-10-28/29
migration backups and acceptance are recorded in
[docs/archive/POSTGRES_MIGRATION.md](docs/archive/POSTGRES_MIGRATION.md).

### Frontend Environment
Scripts auto-create `frontend/.env.production`:
```env
VITE_API_BASE_URI=https://prep-algo-backend-419917211939.us-central1.run.app/api/v1
```

## Deployment URLs

- **Backend**: https://prep-algo-backend-419917211939.us-central1.run.app/api/v1
- **Frontend**: https://prepalgo.web.app

## Monitoring

### Backend
```bash
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=prep-algo-backend' --limit=50
gcloud run services describe prep-algo-backend --region=us-central1
```

### Frontend
```bash
firebase hosting:releases:list --project prepalgo
firebase hosting:releases:rollback --project prepalgo
```

## Deployment Order

1. Build content, take a backup, apply pending PostgreSQL migrations (expand-only
   unless deliberately marked contract; see [Rollback](#rollback)), and configure the isolated
   executor described in [ADR 008](docs/adr/008-code-execution-sandbox.md).
   Production API execution deliberately returns 503 without a remote executor;
   local subprocess fallback is not a production escape hatch.
   The prepared candidate uses Direct VPC egress (`prepalgo-run`, tag
   `prepalgo-api`, private-ranges-only) to `https://10.128.0.2`, with the public
   trust certificate in `backend/config/executor-trust.crt`. No paid external
   IP, connector, NAT or load balancer is needed. The OIDC audience remains
   `https://executor.prepalgo.com`; it is an identifier, not a DNS dependency.
   Patch it with `scripts/executor/patch-window.sh` (quarterly and for urgent
   fixes) and rotate its certificate with `scripts/executor/rotate-cert.sh`;
   ADR 008 has both procedures. A monthly GitHub Action opens reminder issues.
2. Deploy backend candidate: `./deploy-to-cloudrun.sh`. This sends **zero traffic**.
   The script checks health/readiness/content and records an ignored
   `.cloudrun-candidate.json` receipt containing exact revision/content identities.
3. Perform authenticated candidate acceptance: real Google sign-in, ownership,
   code/MCQ grading and saved progress, recommendations, retry deduplication.
4. Promote with `./deploy-to-cloudrun.sh --promote EXACT_REVISION`. The candidate
   tag, recent smoke receipt, current content and live candidate identity must
   still match. Promotion targets the immutable revision, not a mutable tag.
5. Publish frontend: `./deploy-to-firebase.sh`. It checks that production backend
   content matches the frontend manifest and deploys the generated
   `firebase.generated.json` (written by `scripts/hosting/prepare.mjs`, gitignored).
6. Verify real navigation and missing-asset headers, old-tab behavior and
   authenticated workflows. Keep the printed rollback revision and hosting archive.

## Preproduction testing policy and capacity

The current Neon database is a shared **testing** database while there are no real
users. Do not copy its credentials into executor packages. Separate development
and production before onboarding users; a Neon branch is an option if the current
plan permits it. Before any destructive migration, take a provider backup or
snapshot and verify its restore procedure (see
[Database migrations and backups](#database-migrations-and-backups)).

The next Cloud Build candidate explicitly requests 0 minimum / 2 maximum
instances **per revision**, concurrency 8, 1 CPU, 512 MiB, a 30-second HTTP timeout
and `PG_POOL_MAX=3`. This is a conservative testing baseline, not a measured
capacity promise. One active revision can open 6 application connections; two
overlapping revisions can open 12, plus local development, tests, migration/admin
connections and other clients. Confirm the Neon connection budget before deploying.
Cloud Run's maximum can be exceeded briefly during maintenance or scaling; it is
not a hard spending or database-connection guarantee. Old revisions retain their
old configuration until retired.

On 2026-10-28, read-only inspection found the live revision still configured for
10 maximum instances, concurrency 1, 512 MiB, a 300-second timeout, and the compute
default service account. These live settings have **not** been changed. Before
public launch, use an API-specific service account with access only to its required
secrets; list that identity in `EXECUTOR_CALLERS`.

### Monitoring activation

**Cost guard (active since 2026-10-29).** Billing account `PrepAlgo` is billed
in INR. Budget `PrepAlgo monthly (~10 USD)` is ₹1,000/month on project
`prepalgo` (≈ $10 at 95.30 INR/USD), emailing billing admins at 50/90/100%
actual and 100% forecast spend. It also publishes to Pub/Sub topic
`prepalgo-budget-alerts`, which triggers the `prepalgo-budget-guard` function
(`scripts/budget-guard/`). When **actual** spend reaches the shutoff limit
(`SHUTOFF_AMOUNT`, ₹2,000 ≈ $20, deliberately above the ₹1,000 budget so the
50/90/100% emails warn first), the guard
sets Cloud Run `prep-algo-backend` ingress to internal-only and releases a
one-file Firebase Hosting version (`scripts/budget-guard/maintenance.html`) that
answers every path with a self-contained, no-store, noindex "temporarily
paused" page. The site stays reachable and costs almost nothing to serve. Forecasts never act. The executor VM
and databases are untouched. Billing data lags by hours, so this bounds
runaway spend rather than preventing it; Cloud Run max instances remain the
primary limit. The guard runs as `prepalgo-budget-guard` (run.developer on the
API service only, actAs `prepalgo-api`, Firebase Hosting admin). Redeploy with
`scripts/budget-guard/deploy.sh` (dry run by default; `DRY_RUN=false` arms it).

To recover after it fires: raise `SHUTOFF_AMOUNT` or redeploy with
`DRY_RUN=true` first (budget notifications repeat several times a day and would
fire again), then `node scripts/budget-guard/maintenance.mjs off`, which reopens
ingress and re-releases the Hosting version from before the maintenance page. Spend resets monthly, but the shutdown does not undo itself.

**Paid alert policies are intentionally not created.** Cloud Monitoring bills a
fixed monthly fee per alert condition even if it never fires.
`scripts/monitoring/api-errors.json` and `api-latency.json` remain unapplied
templates for later. To use them, replace `REPLACE_ME` with a verified
notification-channel ID and create them with `gcloud alpha monitoring policies
create --policy-from-file=... --project=prepalgo`. Do not claim alerts are
active until a deliberate test reaches the intended recipient.

Observe Neon pool pressure/slow transactions,
Upstash quota, and executor memory/CPU/queue errors during the staging load check.
Start with one grading submission at a time; overload must return 503/Retry-After,
not an incorrect grading result. Baseline latency includes deliberate execution
timeouts and is not equivalent to browse latency.

### Rollback

Rollback moves **traffic only**; it never changes data. There are three tools,
in order of preference:

| Situation | Action |
| --- | --- |
| A PostgreSQL release misbehaves and an earlier PostgreSQL revision is good | `./deploy-to-cloudrun.sh --rollback REVISION` |
| No safe revision exists (for example the first PostgreSQL release), or data is at risk | `node scripts/budget-guard/maintenance.mjs on`, then fix forward |
| Data itself is wrong | Restore a backup **into a new Neon branch**, reconcile, then switch |

**Revision rollback.** `--rollback` first runs `scripts/release/rollback.mjs
check` on the target. It refuses:

- MongoDB-backed revisions (they have `MONGO_URI`), such as the
  pre-migration `prep-algo-backend-00045-5fk`; they cannot see PostgreSQL writes.
- Revisions without `DATABASE_URL`, or not Ready.
- Revisions older than the latest contract migration (below).
- Unlabeled revisions, which include the current candidate
  `prep-algo-backend-00049-das`, once the schema passes `002`; those builds refuse
  to start on any database migration they do not know.

It then tags the target `rollback`, checks `/health/ready` (skipped while
ingress is internal), and moves 100% of traffic. If the frontend release used
new API behavior, roll Hosting back too. `--promote` prints the right command,
or warns when the replaced revision is not a safe target.

**Expand/contract migrations.** Every migration must leave the *previous*
release working, so the previous revision stays a rollback target:

1. **Expand:** add tables, nullable columns or columns with defaults, and
   indexes. Ship code that works with both shapes.
2. **Contract:** drop, rename, change types or tighten constraints only in a
   later release, after nothing older needs the old shape. Mark the file with a
   `-- prepalgo:contract` line. That raises the rollback floor: older
   revisions become ineligible.

`npm test` and every candidate deploy lint the migrations and fail on unmarked
breaking statements. Candidates are labeled `prepalgo-schema=<latest
migration>`. Since this change, startup accepts migrations newer than the
release (logged as a warning) so a rolled-back revision can start. `db:migrate`
stays strict and refuses to run from an older checkout. Older revisions resync
the content catalog to their own content revision at startup; rolling forward
resyncs it again.

**Maintenance mode (fix forward).** `maintenance.mjs on` uses the operator's
gcloud credentials and the budget guard's mechanism: API ingress becomes
internal-only and the "temporarily paused" page is served on every path. Use
`status` to inspect and `--dry-run` to preview. `off` reopens ingress and
re-releases the newest non-maintenance Hosting version, failing if retention
pruned it (then redeploy the frontend). The database is preserved throughout.

**Returning to MongoDB** is not supported: MongoDB was never dual-written and
the pre-cutover revisions are refused by the rollback guard. Never restore a
database snapshot over new attempts without explicitly accepting their loss.

**Data recovery.** Before any migration or risky release, take the verified
logical backup ([above](#database-migrations-and-backups)). Restore into
a new Neon branch or a local container, compare, and repair forward. Never
restore over the live branch while it holds newer writes.

### Hosting cache and retained artifacts

Only application navigation routes rewrite to `index.html`; missing `/assets`,
`/content` and `/api` paths return genuine hosting 404s. Navigation and unknown
paths revalidate. The generated Firebase configuration assigns year-long immutable
caching only to files that actually exist in the build. Do not deploy the template
`firebase.json` directly: it is safe but intentionally lacks optimized hash headers.

Builds preserve prior hashed content and JS chunks. Deployment restores published
hashes using the integrity-checked `/release-assets.json` inventory, including on
clean machines. Do not delete the build before deployment or configure Vite to
empty it. Archive the complete published build as a release artifact.

**First inventory rollout:** the old production build has no inventory. Restore
its complete archived `assets/` and `content/` into `frontend/build` first, then
explicitly run `HOSTING_BOOTSTRAP=1 ./deploy-to-firebase.sh`. Without that archive,
old-tab compatibility for pre-inventory releases cannot be guaranteed; do not
silently assume a local development build is the deployed build.

On 2026-10-29 the pre-PostgreSQL live version `84e046ac5a987017` (released
2026-09-30, 425 files) was archived outside the repository with per-file SHA-256
sums, after confirming the live channel still served that version. Firebase
Hosting retention was raised from `maxVersions: 1` to `5`, so this version is
also kept server-side after the next deploy and remains a console/CLI rollback
target (Firebase console → Hosting → release history → Rollback on that
version). Do
not lower retention without first archiving the version being displaced.

Retain hashes for at least the advertised cache/compatibility period. This small
catalog currently retains all hashes; storage pruning requires a deliberate
retention policy and old-tab checks, not an unconditional build cleanup.

Per-item content revisions cover grading keys as well as visible text. New clients
receive 409 with reload guidance when an old tab submits changed content, rather
than being silently graded against a different question. Unchanged questions
remain compatible. Legacy clients without revision metadata are transitional.

### Operational acceptance before increasing scale

Measure cold/warm request latency separately, execution queue/run time, overload
responses, event-loop lag, memory, Redis RTT/errors, and PostgreSQL pool/lock wait.
Run mixed browsing/grading traffic against a candidate and inject dependency
failures in staging. Existing Cloud Run concurrency 1 and max instances 10 are
not throughput guarantees; increase API concurrency only after isolated execution
and connection budgets are demonstrated. Keep minimum instances 0 unless measured
cold-start impact justifies the recurring cost.

HTTP request logs include Cloud Run revision/content identity; execution logs are
info-level and include queue/run timings. Set release-aware dashboards and alerts
in the cloud account before public launch. Those external dashboards, executor capacity
under load, actual Neon ceilings/region measurements, and regional production
load results are operational work—not verified by local tests.
