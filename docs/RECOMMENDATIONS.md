# Smart Recommendation System

Personalized daily practice. Implementation:
`backend/controller/smartRecommendations.js`, `backend/models/UserProfile.js`,
`backend/models/DailyRecommendationBatch.js` and
`backend/repositories/recommendationRepository.js`. User state lives in
PostgreSQL; catalog counts come from the compiled `content/` catalog, so new
questions change topic totals without a database migration.

## API

All routes are under `/api/v1/recommendations`, require a JWT, and may only
address the caller's own `:userId` (`requireSelf`).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/:userId/daily?count=5` | Return today's batch, creating it idempotently if missing. Never replaces an existing batch; `forceRefresh=true` is rejected. |
| POST | `/:userId/refresh` | Replace the batch when refresh is eligible (below). |
| POST | `/:userId/replace-completed` | Replace completed items, keep incomplete ones. |
| POST | `/:userId/complete` | Body `{ "questionId": "..." }`; marks an item complete in today's batch (404 if none). |
| POST | `/:userId/track` | Body `{ questionId, action: "attempted" \| "skipped", clickedAt? }`; feeds weight adaptation. |

The daily response contains `recommendations`, `analysis` (user level, totals,
`streakInfo`, `topicMastery`, weak/strong areas) and `batchInfo`
(`canRefresh`, `canReplaceCompleted`, `lastRefreshAt`).

## Batches and refresh

- Batches are keyed by **UTC** day and expire at 06:00 UTC the next day.
- Refresh is allowed when the batch is from an earlier day and has progress,
  when every item is complete, or when it is marked stale — and not within one
  hour of the previous refresh.
- `replace-completed` is available once at least one item is complete.

## Topic mastery

Coverage is the share of a topic's catalog questions the learner attempted;
solve rate and average attempts come from recorded submissions.

| Level | Rule |
| --- | --- |
| mastered | ≥80% coverage, ≥90% solve rate, ≤2.5 avg attempts |
| proficient | ≥60% coverage, ≥85% solve rate, ≤3.0 avg attempts |
| practicing | ≥40% coverage, ≥75% solve rate |
| learning | ≥15% coverage or ≥3 questions attempted |
| beginner | otherwise |

## User classification

- **Advanced:** ≥60 solved, ≥40% of topics attempted, and one of: ≥25% of
  attempted topics mastered with ≥50% proficient+; ≥2 mastered and ≥3
  proficient; ≥15% hard with ≥2 mastered.
- **Intermediate:** ≥25 solved, ≥25% of topics attempted, and one of: ≥1
  mastered with ≥3 proficient/practicing; ≥35% medium across ≥30% of topics;
  ≥8% hard across ≥20% of topics.
- **Beginner:** everything else.

Target difficulty: beginner → Easy, intermediate → Easy/Medium,
advanced → Medium/Hard, with promotion when a learner's recent mix is
dominated by the easier tier.

## Strategies and adaptive weights

Default weights (`UserProfile.DEFAULT_WEIGHTS`), normalized to 1.0:

| Strategy | Default |
| --- | --- |
| weak_area_reinforcement | 0.40 |
| progressive_difficulty | 0.30 |
| spaced_repetition | 0.20 |
| topic_exploration | 0.07 |
| general_practice | 0.03 |

Tracked outcomes adjust weights in small steps (for example, a success rate
below 0.4 lowers progressive difficulty), bounded and renormalized. Concurrent
profile changes win over this optional adjustment. Slots are distributed across
domains (coding, system design) by the learner's domain preferences.

## Semantics

`solveCount` counts successful submissions; `attemptCount` counts all
submissions. Struggle/mastery heuristics use attempts. Daily activity and
streaks derive from successful attempt events in UTC; a streak stays current
through yesterday until today's opportunity has passed. See
[POSTGRES_MIGRATION.md](POSTGRES_MIGRATION.md#follow-up-correctness-and-scale-changes).

## Validation

- `npm --prefix backend test` — unit and isolated PostgreSQL integration tests.
- `npm --prefix backend run validate-recommendations[:verbose]` — exercises a
  running API (`API_BASE_URL`, see `backend/scripts/README.md`).
