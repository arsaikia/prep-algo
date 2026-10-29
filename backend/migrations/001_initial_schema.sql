-- Initial PostgreSQL schema. Tables are unqualified so the runner's
-- search_path decides the target schema (tests use an isolated schema).

CREATE TABLE users (
    id          text PRIMARY KEY,
    first_name  text,
    last_name   text,
    email       text UNIQUE CHECK (email = lower(email)),
    google_id   text NOT NULL UNIQUE,
    role        text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    picture     text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content_refs (
    id          text PRIMARY KEY,
    slug        text UNIQUE,
    domain      text,
    type        text,
    group_name  text,
    difficulty  text,
    active      boolean NOT NULL DEFAULT true,
    title       text,
    legacy_id   text,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content_progress (
    id                    text NOT NULL UNIQUE,
    user_id               text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content_id            text NOT NULL REFERENCES content_refs (id),
    solve_count           integer NOT NULL DEFAULT 0 CHECK (solve_count >= 0),
    attempt_count         integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    first_solved_at       timestamptz,
    last_solved_at        timestamptz,
    last_attempt_at       timestamptz,
    average_time_to_solve double precision,
    difficulty_rating     integer CHECK (difficulty_rating BETWEEN 1 AND 5),
    note                  text,
    tags                  text[] NOT NULL DEFAULT '{}',
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, content_id)
);
CREATE INDEX content_progress_user_last_solved_idx ON content_progress (user_id, last_solved_at DESC);
CREATE INDEX content_progress_content_idx ON content_progress (content_id);

CREATE TABLE attempts (
    id             text PRIMARY KEY,
    user_id        text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content_id     text NOT NULL REFERENCES content_refs (id),
    submission_key text,
    request_hash   text,
    success        boolean NOT NULL,
    occurred_at    timestamptz NOT NULL DEFAULT now(),
    time_spent     double precision,
    context        jsonb NOT NULL DEFAULT '{}',
    result         jsonb,
    source         text NOT NULL DEFAULT 'app',
    UNIQUE (user_id, submission_key)
);
CREATE INDEX attempts_user_occurred_idx ON attempts (user_id, occurred_at DESC);
CREATE INDEX attempts_user_content_occurred_idx ON attempts (user_id, content_id, occurred_at DESC);

CREATE TABLE user_profiles (
    user_id    text PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    data       jsonb NOT NULL DEFAULT '{}',
    version    integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recommendation_batches (
    id         text PRIMARY KEY,
    user_id    text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    batch_date date NOT NULL,
    data       jsonb NOT NULL DEFAULT '{}',
    version    integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, batch_date)
);

CREATE TABLE recommendation_items (
    batch_id     text NOT NULL REFERENCES recommendation_batches (id) ON DELETE CASCADE,
    content_id   text NOT NULL REFERENCES content_refs (id),
    position     integer NOT NULL,
    data         jsonb NOT NULL DEFAULT '{}',
    completed_at timestamptz,
    time_spent   double precision,
    success      boolean,
    PRIMARY KEY (batch_id, content_id)
);
CREATE INDEX recommendation_items_content_idx ON recommendation_items (content_id);

-- Audit trail for the one-off MongoDB import. Rows that cannot be mapped onto
-- the relational schema (unknown user or content) are archived raw here
-- instead of being dropped.
CREATE TABLE legacy_import_runs (
    id          bigserial PRIMARY KEY,
    source      text NOT NULL,
    started_at  timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    summary     jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE legacy_import_orphans (
    id               text PRIMARY KEY,
    source_collection text NOT NULL,
    source_id        text NOT NULL,
    reason           text NOT NULL,
    raw              jsonb NOT NULL,
    first_seen_run   bigint REFERENCES legacy_import_runs (id),
    archived_at      timestamptz NOT NULL DEFAULT now()
);
