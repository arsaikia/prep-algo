import pg from 'pg';
import logger from './logger.js';
import { listItems } from '../utils/contentStore.js';

/**
 * PostgreSQL access for the backend. Nothing here reads the environment or
 * opens a connection at import time: the pool is built on first use from
 * `DATABASE_URL`, so entrypoints can load `.env` before touching the database.
 */

const DEFAULTS = {
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statementTimeoutMillis: 15_000,
    queryTimeoutMillis: 20_000,
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const SSL_URL_PARAMS = ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat'];

let pool = null;
let poolInjected = false;
let state = {
    status: 'disabled',
    configured: false,
    lastCheckedAt: null,
    lastErrorCode: null,
};

function setState(patch) {
    state = { ...state, ...patch };
}

function intFromEnv(name, fallback) {
    const value = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** A pg error code or errno string that is safe to log; never a message. */
function safeCode(error) {
    const code = error?.code;
    return typeof code === 'string' && /^[A-Z0-9_]{2,40}$/i.test(code) ? code : null;
}

/** Strip anything that looks like a connection string or credential. */
function scrub(text) {
    return String(text ?? '')
        .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s'"]+/gi, '<redacted-url>')
        .replace(/(password|passwd|pwd)\s*[=:]\s*\S+/gi, '$1=<redacted>')
        .replace(/(user|role|database)\s+"[^"]*"/gi, '$1 "<redacted>"');
}

/**
 * Copy of a pg error that keeps the fields callers branch on (`code`,
 * `constraint`, `table`, ...) and drops anything that can carry credentials.
 */
export function sanitizePostgresError(error, context = 'PostgreSQL operation failed') {
    if (error?.isSanitizedPostgresError) return error;
    const code = safeCode(error);
    const detail = scrub(error?.message).slice(0, 500);
    const sanitized = new Error(`${context}${code ? ` (${code})` : ''}${detail ? `: ${detail}` : ''}`);
    sanitized.name = 'PostgresError';
    sanitized.isSanitizedPostgresError = true;
    if (code) sanitized.code = code;
    for (const key of ['constraint', 'table', 'column', 'schema', 'severity', 'routine']) {
        if (typeof error?.[key] === 'string') sanitized[key] = error[key];
    }
    if (typeof error?.statusCode === 'number') sanitized.statusCode = error.statusCode;
    return sanitized;
}

/**
 * Build pg pool options for a connection string. TLS is verified whenever the
 * URL asks for it (any sslmode other than disable) or the host is not local;
 * the URL's ssl params are removed so pg cannot downgrade verification.
 */
export function buildPoolConfig(connectionString, overrides = {}) {
    if (!connectionString) {
        const error = new Error('DATABASE_URL is not set');
        error.code = 'PG_NOT_CONFIGURED';
        throw error;
    }
    let url;
    try {
        url = new URL(connectionString);
        if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('protocol');
    } catch {
        const error = new Error('DATABASE_URL must be a postgres:// or postgresql:// URL');
        error.code = 'PG_INVALID_URL';
        throw error;
    }

    const sslmode = url.searchParams.get('sslmode');
    const local = LOCAL_HOSTS.has(url.hostname);
    for (const param of SSL_URL_PARAMS) url.searchParams.delete(param);

    let ssl = false;
    if (sslmode === 'disable') {
        if (!local) {
            const error = new Error('sslmode=disable is only allowed for local databases');
            error.code = 'PG_TLS_REQUIRED';
            throw error;
        }
    } else if (sslmode || !local) {
        ssl = { rejectUnauthorized: true };
    }

    const { searchPath, applicationName, ...rest } = overrides;
    const config = {
        connectionString: url.toString(),
        ssl,
        max: intFromEnv('PG_POOL_MAX', DEFAULTS.max),
        idleTimeoutMillis: DEFAULTS.idleTimeoutMillis,
        connectionTimeoutMillis: intFromEnv('PG_CONNECT_TIMEOUT_MS', DEFAULTS.connectionTimeoutMillis),
        statement_timeout: intFromEnv('PG_STATEMENT_TIMEOUT_MS', DEFAULTS.statementTimeoutMillis),
        query_timeout: intFromEnv('PG_QUERY_TIMEOUT_MS', DEFAULTS.queryTimeoutMillis),
        idle_in_transaction_session_timeout: 60_000,
        // Neon suspends idle computes; short idle reaping plus keepAlive means
        // stale sockets are dropped and the next checkout reconnects (waking it).
        keepAlive: true,
        application_name: applicationName || 'prepalgo-backend',
        ...rest,
    };
    if (searchPath) {
        if (!/^[a-z_][a-z0-9_]{0,62}$/.test(searchPath)) {
            throw new Error('searchPath must be a plain lowercase schema identifier');
        }
        config.options = `-c search_path=${searchPath}`;
    }
    return config;
}

/**
 * Standalone pool for scripts and tests (e.g. an isolated schema via
 * `searchPath`). The caller owns it and must `end()` it.
 */
export function createPostgresPool({ connectionString = process.env.DATABASE_URL, ...overrides } = {}) {
    const created = new pg.Pool(buildPoolConfig(connectionString, overrides));
    created.on('error', (error) => {
        // Idle client errors (e.g. server restarts) must not crash the process.
        logger.warn({ code: safeCode(error) }, 'PostgreSQL idle client error');
    });
    return created;
}

/** Shared application pool, created lazily from DATABASE_URL. */
export function getPool() {
    if (!pool) {
        try {
            pool = createPostgresPool();
        } catch (error) {
            setState({ status: 'disabled', configured: false, lastErrorCode: safeCode(error) });
            throw sanitizePostgresError(error, 'PostgreSQL is not configured');
        }
        setState({ configured: true, status: state.status === 'ok' ? 'ok' : 'connecting' });
        pool.on('error', (error) => {
            setState({ status: 'down', lastErrorCode: safeCode(error) });
        });
    }
    return pool;
}

/**
 * Test seam: make getPool()/query()/withTransaction() use `testPool` (e.g. one
 * bound to an isolated schema). Pass null to restore lazy DATABASE_URL pooling.
 * The caller keeps ownership of the injected pool; this never ends it.
 */
export function setPoolForTesting(testPool) {
    pool = testPool || null;
    poolInjected = Boolean(testPool);
    setState(testPool
        ? { status: 'ok', configured: true, lastErrorCode: null }
        : { status: 'disabled', configured: false, lastErrorCode: null });
}

/** Run one statement on the shared pool. Errors keep pg's `code`. */
export async function query(text, params) {
    try {
        return await getPool().query(text, params);
    } catch (error) {
        throw sanitizePostgresError(error, 'PostgreSQL query failed');
    }
}

/**
 * Run `fn(client)` inside BEGIN/COMMIT on one pooled client, rolling back on
 * any error. Errors thrown by `fn` are rethrown unchanged unless they come from
 * pg, which are sanitized but keep their `code`.
 */
export async function withTransaction(fn, { pool: targetPool } = {}) {
    const started = Date.now();
    const client = await (targetPool || getPool()).connect().catch((error) => {
        throw sanitizePostgresError(error, 'PostgreSQL connection failed');
    });
    const acquired = Date.now();
    let releaseError;
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            releaseError = rollbackError;
        }
        if (error instanceof pg.DatabaseError) {
            throw sanitizePostgresError(error, 'PostgreSQL transaction failed');
        }
        throw error;
    } finally {
        client.release(releaseError);
        const durationMs = Date.now() - started;
        if (durationMs > 250) logger.info({
            durationMs, poolWaitMs: acquired - started,
            waiting: (targetPool || pool)?.waitingCount,
        }, 'PostgreSQL transaction timing');
    }
}

/** Verify connectivity with `SELECT 1`. Throws a sanitized error on failure. */
export async function connectPostgres() {
    const target = getPool();
    if (state.status !== 'ok') setState({ status: 'connecting' });
    try {
        await target.query('SELECT 1');
        setState({ status: 'ok', lastCheckedAt: new Date().toISOString(), lastErrorCode: null });
        logger.info('PostgreSQL connected');
    } catch (error) {
        setState({ status: 'down', lastCheckedAt: new Date().toISOString(), lastErrorCode: safeCode(error) });
        throw sanitizePostgresError(error, 'PostgreSQL connection failed');
    }
}

/** Close the shared pool. Safe to call repeatedly. */
export async function disconnectPostgres() {
    const current = poolInjected ? null : pool;
    pool = null;
    poolInjected = false;
    setState({ status: current ? 'disabled' : state.status, configured: false });
    if (current) {
        try {
            await current.end();
        } catch (error) {
            logger.warn({ code: safeCode(error) }, 'PostgreSQL pool did not close cleanly');
        }
    }
}

/**
 * Last known connection state, without querying the database:
 * `{ status: 'ok'|'down'|'connecting'|'disabled', configured, lastCheckedAt, lastErrorCode }`.
 */
export function getPostgresStatus() {
    return {
        ...state,
        pool: pool ? { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount } : null,
    };
}

export const REQUIRED_TABLES = Object.freeze([
    'schema_migrations',
    'users',
    'content_refs',
    'content_progress',
    'attempts',
    'user_profiles',
    'recommendation_batches',
    'recommendation_items',
    'content_catalog_state',
]);

/**
 * Throw (code PG_SCHEMA_NOT_READY) unless every application table exists on
 * the current search_path. Run `npm run db:migrate` to fix.
 */
export async function assertSchemaReady(client = getPool()) {
    let rows;
    try {
        ({ rows } = await client.query(
            'SELECT name FROM unnest($1::text[]) AS name WHERE to_regclass(name) IS NULL',
            [REQUIRED_TABLES],
        ));
    } catch (error) {
        throw sanitizePostgresError(error, 'PostgreSQL schema check failed');
    }
    if (rows.length > 0) {
        const error = new Error(`PostgreSQL schema is not migrated; missing: ${rows.map((r) => r.name).join(', ')}`);
        error.code = 'PG_SCHEMA_NOT_READY';
        error.missingTables = rows.map((r) => r.name);
        throw error;
    }
}

const normalizeSlug = (slug) => String(slug || '').replace(/\/+$/, '');

/** content_refs row for a catalog item; id is the legacy database id when present, else the slug. */
export function contentRefFromItem(item) {
    const slug = normalizeSlug(item.slug);
    return {
        id: item.legacyId ? String(item.legacyId) : slug,
        slug,
        domain: item.domain ?? null,
        type: item.type ?? null,
        group_name: item.group ?? null,
        difficulty: item.difficulty ?? null,
        title: item.title ?? null,
        legacy_id: item.legacyId ? String(item.legacyId) : null,
    };
}

/**
 * Upsert every built catalog item into content_refs and mark refs no longer in
 * the catalog inactive. Never deletes refs, so progress rows stay valid.
 * Refuses to run against an empty catalog (a missing bundle would otherwise
 * deactivate everything). Returns `{ upserted, deactivated }`.
 */
export async function syncContentCatalog(client = getPool(), { items = listItems() } = {}) {
    const refs = items.filter((item) => item?.slug).map(contentRefFromItem);
    if (refs.length === 0) {
        const error = new Error('Content catalog is empty; run `npm run build:content` before syncing');
        error.code = 'CONTENT_CATALOG_EMPTY';
        throw error;
    }
    const seen = new Set();
    for (const ref of refs) {
        for (const key of [`id:${ref.id}`, `slug:${ref.slug}`]) {
            if (seen.has(key)) {
                const error = new Error(`Content catalog has a duplicate ${key.split(':')[0]}`);
                error.code = 'CONTENT_CATALOG_DUPLICATE';
                throw error;
            }
            seen.add(key);
        }
    }
    const col = (name) => refs.map((ref) => ref[name]);
    try {
        // A slug can move to a different id (e.g. an item gains a legacy id);
        // release it from the old row first so the unique constraint holds.
        await client.query(
            `UPDATE content_refs c
                SET slug = NULL, active = false, updated_at = now()
               FROM unnest($1::text[], $2::text[]) AS n(id, slug)
              WHERE c.slug = n.slug AND c.id <> n.id`,
            [col('id'), col('slug')],
        );
        const upserted = await client.query(
            `INSERT INTO content_refs (id, slug, domain, type, group_name, difficulty, title, legacy_id, active, updated_at)
             SELECT id, slug, domain, type, group_name, difficulty, title, legacy_id, true, now()
               FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[])
                 AS n(id, slug, domain, type, group_name, difficulty, title, legacy_id)
             ON CONFLICT (id) DO UPDATE SET
                slug = EXCLUDED.slug, domain = EXCLUDED.domain, type = EXCLUDED.type,
                group_name = EXCLUDED.group_name, difficulty = EXCLUDED.difficulty,
                title = EXCLUDED.title, legacy_id = EXCLUDED.legacy_id,
                active = true, updated_at = now()
              WHERE (content_refs.slug, content_refs.domain, content_refs.type, content_refs.group_name,
                     content_refs.difficulty, content_refs.title, content_refs.legacy_id, content_refs.active)
                IS DISTINCT FROM
                    (EXCLUDED.slug, EXCLUDED.domain, EXCLUDED.type, EXCLUDED.group_name,
                     EXCLUDED.difficulty, EXCLUDED.title, EXCLUDED.legacy_id, true)`,
            [col('id'), col('slug'), col('domain'), col('type'), col('group_name'), col('difficulty'), col('title'), col('legacy_id')],
        );
        const deactivated = await client.query(
            `UPDATE content_refs SET active = false, updated_at = now()
              WHERE active AND NOT (id = ANY($1::text[]))`,
            [col('id')],
        );
        return { total: refs.length, upserted: upserted.rowCount, deactivated: deactivated.rowCount };
    } catch (error) {
        throw sanitizePostgresError(error, 'Content catalog sync failed');
    }
}
