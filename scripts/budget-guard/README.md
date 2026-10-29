# Budget guard

Free cost kill-switch for project `prepalgo`. A Cloud Billing budget publishes
to Pub/Sub topic `prepalgo-budget-alerts`; Cloud Function
`prepalgo-budget-guard` (gen2, us-central1, internal ingress) reacts.

- Budget: ₹1,000/month (~$10). Billing admins receive email at 50/90/100% of
  actual spend and 100% of forecast. No paid Monitoring alert policies.
- Shutoff: when **actual** spend reaches `SHUTOFF_AMOUNT` (default ₹2,000), the
  guard sets the `prep-algo-backend` Cloud Run ingress to internal-only and
  publishes a one-file Hosting release (`maintenance.html`, message
  `Budget guard: maintenance page`) that rewrites every path to a "temporarily
  paused" page. Forecasts never trigger it. Repeated notifications are no-ops.
- `DRY_RUN` defaults to `true` (logs only). Production is armed.

```bash
npm test                                         # from repo root; includes guard.test.mjs
DRY_RUN=false scripts/budget-guard/deploy.sh     # deploy armed (SHUTOFF_AMOUNT=2000 default)
```

`deploy.sh` is idempotent: it enables APIs, creates the service account and
topic, grants least-privilege IAM, deploys, and links the budget to the topic.

Recovery after a shutoff: redeploy with `DRY_RUN=true` or a higher
`SHUTOFF_AMOUNT` (notifications repeat during the month), then run
`node scripts/budget-guard/maintenance.mjs off`. That reopens API ingress and
re-releases the Hosting version from before the maintenance page.

`maintenance.mjs status | on | off [--dry-run]` is also the manual release
maintenance switch, using your gcloud credentials. Full context
is in [DEPLOYMENT_README.md](../../DEPLOYMENT_README.md#monitoring-activation).
