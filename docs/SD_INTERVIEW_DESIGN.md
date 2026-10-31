# System Design learning and interview direction

## Status and scope

The current delivery is original lesson content and UI improvements. The
Excalidraw board, AI interviewer, scoring service and voice mode described below
are **proposals, not implemented features**. There are no new AI provider calls,
credentials or model charges in this change. Backup automation and development
database isolation remain separately deferred work.

## Learning approach

Use Hello Interview's publicly described interview-first preparation approach as
a reference: learn a delivery method, connect core concepts to technologies and
patterns, attempt a design, then review and practise again. Do not copy their
lesson prose, diagrams, paid content, product branding or assessment claims.
PrepAlgo is not affiliated with Hello Interview.

Public references, accessed 2026-10-29:

- [Preparation guide](https://www.hellointerview.com/learn/system-design/in-a-hurry/how-to-prepare)
- [Delivery framework](https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery)

The authored path (modules in order):

1. **Interview Method:** requirements, entities, interfaces, complete baseline,
   focused deep dives and review. Estimate quantities when they affect a decision.
2. **Foundations:** scaling, load balancing, caching, storage tradeoffs,
   indexing, consistency, hashing, rate limits, interfaces, numbers to know and
   networking essentials.
3. **Data & Storage:** replication, data modeling and transactions, sharding,
   search indexes and geospatial indexing.
4. **Scalability & Reliability:** deadlines, retries, backpressure, queues and
   streams.
5. **Distributed Systems:** idempotency, delivery guarantees, consensus and
   coordination.
6. **Patterns:** scaling reads, scaling writes, real-time updates, large blobs,
   long-running tasks, contention and multi-step processes.
7. **Design Case Studies:** 17 end-to-end walkthroughs (URL shortener through
   online judge). Each follows the same sections: requirements, estimates,
   entities, API, high-level design, deep dives, tradeoffs, failure modes and a
   sequence of knowledge checks. Attempt the design before reading.
8. **Reference:** the System Design Handbook, a cheat-sheet that maps problems
   (read-heavy, write-heavy, contention, fanout) to the standard moves. It is
   excluded from progress and previous/next navigation.

Lessons and case studies embed Mermaid diagrams that are validated at build time
(`node scripts/content/check-diagrams.mjs`). Prioritize a concept because it
changes a design decision, not to maximize topic count.

Every lesson has at least three scenario questions, shown one at a time in
ascending quiz `order` (slug breaks ties). A wrong answer unlocks a new attempt.
A correct answer offers **Next question**, or **Complete quiz** on the last
question, rather than starting over. Completion closes the quiz; marking the
lesson complete remains a separate action. A grading or save failure is shown
explicitly and can be retried without creating a duplicate submission.
Guests can practise, but only signed-in quiz submissions save account progress.

Diagrams use a shared pastel palette with dark labels in both themes and
theme-aware connectors, notes and surrounding labels. The renderer keeps
authored status colors, uses Mermaid's strict security mode and serializes
configuration with rendering so rapid theme changes cannot mix themes.

Write like a helpful teammate: short sentences, concrete examples, and a reason
for each design choice. Keep the assumptions, numbers, tradeoffs, failure cases,
code and diagrams; concise means less filler, not less information.

Keep stable slugs and existing progress identifiers. Modules and topic order
drive both the outline and previous/next navigation. Prerequisites are explicit
links, not enforced completion gates. Knowledge checks evaluate a specific
concept; they are not a system design interview grade.

## Proposed first interview experience

A separate, authenticated practice workspace offers a versioned design prompt,
an Excalidraw board, structured notes and a text conversation. Voice,
collaborative cursors and multiplayer sessions are out of scope initially.

The candidate first clarifies requirements, then describes entities and
interfaces, builds a baseline, and explores tradeoffs. The interviewer asks one
focused question at a time, adapts to the candidate's stated assumptions and
does not reveal a reference design during the attempt. The candidate can pause,
resume and explicitly request a final assessment.

Keep self-guided practice usable without AI. An unavailable provider must produce
an explicit error and preserve the draft; never display a fabricated score,
silently convert a failed assessment into success, or charge twice for retries.

## Whiteboard and persistence

Use the maintained Excalidraw React package embedded in the app, not an external
iframe carrying private notes in its URL. Lazy-load it so normal reading and
coding pages do not pay its bundle cost.

Proposed PostgreSQL records:

- `interview_sessions`: owner, prompt/version, target level, status, active time,
  optimistic revision and timestamps.
- `interview_artifacts`: a bounded, versioned Excalidraw scene and structured
  requirements, decisions and unresolved questions.
- `interview_messages`: ordered user/interviewer turns and safe provider status.
- `interview_assessments`: session/artifact revision, rubric version, model
  identifier, structured feedback and measured token/cost usage.

Start with bounded JSONB scenes rather than a new database. Defer file/image
attachments; if they become necessary, use private object storage with access
checks and retention. Do not store large inline images in scene JSON.

Debounced saves use an expected revision. A stale write returns a conflict with
a recovery path rather than silently overwriting another tab. Keep a recoverable
local draft and show unsaved/error state. Pausing an interview stops active-time
accounting; elapsed wall time alone must not be a grading signal.

## Proposed AI boundary

All model access is backend-only. An authenticated, ownership-checked endpoint
admits a turn or assessment under a unique idempotency key and a bound artifact
revision. Persist accepted work and its state before calling the provider, so
network retries can return the same job rather than buying a second assessment.

Supply a bounded conversation, the explicit prompt and user-authored scene
labels/connectors/notes. Unlabeled drawings may be ambiguous: ask for
clarification rather than inventing semantics. A later vision option requires
separate privacy, cost and evaluation review.

Treat all scene text, notes and conversation as untrusted data. They cannot
override the scoring instructions or request secrets, tools or network access.
The model has no code execution, arbitrary URL fetching or access to other
users' sessions. Do not send account identity, tokens, unrelated progress,
hidden quiz answers or application logs to the provider.

Structured output must pass a schema check before storage or display. Record the
prompt, rubric and artifact versions so an assessment is reproducible as an
input/output receipt, without claiming deterministic model output.

## Proposed assessment rubric

Report each dimension on a provisional 0-4 scale, with concrete evidence,
uncertainties, strengths and a next practice action:

| Dimension | Evidence to look for |
| --- | --- |
| Scope and requirements | Prioritized user actions and relevant, measurable goals |
| Entities and interfaces | Clear ownership, contracts and request semantics |
| Working baseline | Complete request/data flow and explicit persistence boundaries |
| Scale and tradeoffs | Alternatives justified by workload and requirements |
| Reliability and correctness | Failure behavior, consistency, retries and duplicate effects |
| Communication and adaptation | Reasoning and responses to probes, not drawing polish |

A score must cite candidate evidence, not reward a vendor name or resemblance
to one reference diagram. Unassessable dimensions stay unassessable rather than
receiving zero. Do not convert an average into a hiring recommendation or a
claimed interview pass probability. Role-level expectations and any aggregate
weights need calibration before becoming product promises.

Distinguish a missing explanation from an incorrect assertion. Surface conflicting
evidence or low confidence. Feedback should invite reflection and a retry, not
give the appearance of an objective human interview verdict.

## Cost, privacy and abuse gates

Choose the provider/model, data retention and allowed spend with the owner before
implementation. Do not reuse the code executor VM for model hosting.

Enforce per-user and global admission limits, maximum scene/message/context
sizes, bounded turn count, output tokens, request deadline and active jobs.
Reserve against an application AI spending allowance before admission; reconcile
actual usage afterward and retain uncertain reservations for reconciliation.
Billing-budget emails alone are not synchronous cost enforcement.

The UI must disclose what is sent for AI processing and require an explicit
start/assessment action. Provide deletion and retention policies covering scenes,
transcripts, assessments and provider data. Do not log full user content by
default. Resolve provider region/training/retention terms before launch.

## Delivery and acceptance gates

1. Ship self-guided board and notes with save/reload/export/delete, ownership
   isolation, size limits and stale-save recovery.
2. Add a feature-gated text interviewer after provider, privacy and budget
   decisions. Exercise rate limits, timeouts, cancellation and retry deduplication.
3. Add assessment only after a versioned evaluation set covers good alternatives,
   incomplete work, incorrect claims, prompt injection, unlabeled boards and
   provider failures. Compare with human-reviewed rubric annotations.
4. Pilot with constrained usage; inspect score drift, feedback usefulness, latency
   and actual cost before broad availability.
5. Consider voice only after the text experience is reliable. Specify recording,
   transcription consent and retention separately.

No public claim of an AI-graded live interview should appear before these
implementation and acceptance gates are met.
