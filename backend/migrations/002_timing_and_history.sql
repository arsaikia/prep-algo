ALTER TABLE content_progress
    ADD COLUMN timed_solve_count integer NOT NULL DEFAULT 0 CHECK (timed_solve_count >= 0);

-- A legacy average is one observation; new timed successes extend it.
UPDATE content_progress SET timed_solve_count = 1
WHERE average_time_to_solve IS NOT NULL AND solve_count > 0;

CREATE INDEX attempts_user_content_recent_idx
    ON attempts (user_id, content_id, occurred_at DESC, id DESC);
CREATE INDEX content_progress_user_attempt_idx
    ON content_progress (user_id, last_attempt_at DESC, content_id);

CREATE TABLE content_catalog_state (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    revision text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
