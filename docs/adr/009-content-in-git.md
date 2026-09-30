# ADR-009: Static content lives in git, not the database

## Status

Accepted — implemented in Step 3 of the V2 architecture plan.

## Context

Every question, quiz and system-design topic was a row in the MongoDB
`questions` collection. Serving a list of them meant a database round-trip on
every page load, and the payload was **133 KB** of JSON that had not changed in
weeks.

This was wrong on four counts:

1. **It is not dynamic data.** A problem statement changes when a human edits
   it and at no other time. Paying a database query — plus cache-invalidation
   reasoning, plus connection-pool pressure — for data with an edit frequency
   measured in weeks is pure overhead.
2. **There was no review.** Content was mutated by ad-hoc scripts against a
   live cluster. There was no diff, no history, no rollback, and no way to
   answer "who changed this and why".
3. **It could not be cached properly.** Because the payload was generated
   per-request from mutable rows, the strongest available header was a short
   TTL. A CDN could never hold it.
4. **Hidden test cases and quiz answer keys sat in the same documents as the
   public fields**, so every projection was one forgotten `select` away from
   publishing the answers.

## Decision

`content/` in the repository is the source of truth. A build step compiles it
into immutable, content-addressed artifacts.

```
content/**.json            authored, reviewed, versioned in git
        │
        │  npm run build:content   (Zod validation + integrity checks)
        ▼
frontend/public/content/   public, CDN-immutable
  manifest.json              unhashed pointer, 60s TTL
  index.<hash>.json          list payload, immutable
  items/<slug>.<hash>.json   one file per item, immutable
backend/content/           server-only, never published
  testcases.json             hidden test cases
  quiz-answers.json          correct options + explanations
```

Three properties make this work:

**Content-addressed names.** Filenames embed the first 10 hex characters of
the sha256 of the bytes they contain. Anything hashed can be served
`immutable, max-age=31536000`. Only `manifest.json` is revalidated, so a
content deploy costs each client exactly one conditional request.

**Deterministic output.** Keys are sorted recursively before serialisation and
items are sorted on a total order (`domain → group → order → slug`). Identical
input produces byte-identical output. This is not cosmetic: if the bytes
shifted between builds, every deploy would change every hash and invalidate
every client's cache. A test asserts it.

**An explicit publish allowlist.** `publicBody()` enumerates the fields each
type may publish rather than deleting the secret ones. Adding a field to the
schema therefore defaults to *not* published. The inverse — a denylist — fails
open, which is how answer keys leak.

Splitting `Question` into `problem` / `quiz` / `topic` happens here too, since
the export is already rewriting every record. System Design in particular stops
pretending to be something you "solve": its items become topics with prose
bodies and a `prerequisites` edge list, which is the graph Phase 4's guided
paths will traverse.

## Alternatives considered

**Keep content in Mongo, cache harder.** Cheapest change, but it addresses
only symptom 3. Content is still unreviewable, still unversioned, and the
answer keys still live one projection away from the client.

**A headless CMS (Contentful, Sanity).** Good authoring UX, but adds a vendor,
a per-seat cost, and a network dependency at build time — for a single-author
project. Git already provides review, history, blame and rollback.

**Bundle content into the JS.** Simplest to fetch, but it couples content
edits to application deploys and puts 46 KB of problem statements into the
critical path whether or not the page needs them.

**Publish unhashed files with a short TTL.** Avoids the build step, but gives
up `immutable` and so re-downloads content that provably has not changed.

## Consequences

**Good**

- The list payload drops from **133 KB uncached to 7.8 KB gzipped, served from
  CDN edge** — and to zero bytes on repeat visits.
- Content changes become pull requests: diffed, reviewed, reverted with
  `git revert`.
- Invalid content cannot reach production. The build validates every file
  against a Zod schema and fails on duplicate slugs or dangling
  `prerequisites` / `relatedProblems` references.
- Answer keys are structurally incapable of being published — they are written
  to a different directory that the frontend build never reads.
- The database stops serving reads that were never dynamic, which is a
  precondition for the Postgres migration in Step 6.

**Costs and risks**

- Content edits now require a deploy. Acceptable at this edit frequency, and
  the honest trade for reviewability.
- The build step is a new thing that can break. Mitigated by six tests
  covering reproducibility, leak prevention, and manifest→index→item
  resolution.
- **Firebase Hosting's `**` → `index.html` rewrite will serve HTML for a
  missing content file rather than a 404.** A stale client requesting a hash
  that no longer exists would otherwise `JSON.parse("<!doctype html>")`. The
  client loader must verify the response content-type and fall back to
  re-fetching `manifest.json`; this is implemented in Step 4, not here.
- `content/` and the database will disagree until the legacy
  `/api/v1/questions` reads are removed in Step 4. Until then Mongo remains
  authoritative for anything not yet migrated, and
  `backend/scripts/exportContentToFiles.js` is kept as the reproducible record
  of how the corpus was moved.
