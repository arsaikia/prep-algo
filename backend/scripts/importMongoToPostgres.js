import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    assertSchemaReady, createPostgresPool, sanitizePostgresError, syncContentCatalog,
} from '../config/postgres.js';

/**
 * One-off MongoDB → PostgreSQL import.
 *
 * Reads the legacy collections raw (no app models), then inside ONE Postgres
 * transaction: syncs content_refs from the built catalog, inserts users,
 * profiles, progress summaries, every embedded solve event as an attempt, and
 * recommendation batches/items. Rows that cannot be mapped (unknown user or
 * content, identity conflicts, duplicates) are archived raw in
 * legacy_import_orphans and listed in the report — never silently dropped.
 *
 * Idempotent: every insert is `ON CONFLICT DO NOTHING` keyed on ids derived
 * from Mongo ids (attempt ids are `legacy:<event _id>` or
 * `legacy:<progress _id>:<index>`), so re-running neither duplicates rows nor
 * overwrites anything written by the Postgres app since. Dry-run executes the
 * same transaction and rolls it back. The report contains ids and counts only,
 * never emails, names or URIs.
 */

export const DEFAULT_COLLECTIONS = Object.freeze({
    users: 'users',
    solveHistories: 'solvehistories',
    profiles: 'userprofiles',
    batches: 'dailyrecommendationbatches',
});

const SOURCE = 'mongo_import';
const MAX_REPORT_ENTRIES = 200;

class DryRunRollback extends Error {}

/** Convert BSON/Date values into JSON-safe plain data (dates → ISO strings). */
export function toPlain(value) {
    if (value === null || value === undefined) return value ?? null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    if (typeof value !== 'object') return typeof value === 'number' && !Number.isFinite(value) ? null : value;
    switch (value._bsontype) {
        case 'ObjectId':
        case 'ObjectID':
            return value.toHexString();
        case 'Decimal128':
            return Number(value.toString());
        case 'Long':
        case 'Int32':
        case 'Double':
            return Number(value.valueOf ? value.valueOf() : value.toString());
        case 'Binary':
        case 'UUID':
            return value.toString('hex');
        default:
            break;
    }
    if (Array.isArray(value)) return value.map(toPlain);
    if (Buffer.isBuffer(value)) return value.toString('base64');
    const out = {};
    for (const [key, v] of Object.entries(value)) {
        if (v !== undefined) out[key] = toPlain(v);
    }
    return out;
}

const idOf = (value) => (value === null || value === undefined ? null : String(toPlain(value)));

function toDate(value) {
    if (value === null || value === undefined) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

const maxDate = (...dates) => dates.filter(Boolean).reduce((a, b) => (b > a ? b : a), null);

function toNumber(value) {
    const n = Number(toPlain(value));
    return value === null || value === undefined || !Number.isFinite(n) ? null : n;
}

const normalizeSlug = (slug) => String(slug || '').trim().replace(/\/+$/, '');

function without(doc, keys) {
    const out = { ...doc };
    for (const key of keys) delete out[key];
    return out;
}

/** Read the legacy collections raw. Mongoose is only used as a driver here. */
export async function readMongoSnapshot({
    mongoUri, dbName, collections = DEFAULT_COLLECTIONS, serverSelectionTimeoutMS = 15_000,
}) {
    if (!mongoUri) throw new Error('mongoUri is required');
    const mongoose = (await import('mongoose')).default;
    const connection = mongoose.createConnection(mongoUri, {
        serverSelectionTimeoutMS, readPreference: 'primaryPreferred', autoIndex: false, autoCreate: false,
    });
    try {
        await connection.asPromise();
        const db = dbName ? connection.useDb(dbName, { useCache: false }).db : connection.db;
        const read = (name) => db.collection(name).find({}).sort({ _id: 1 }).toArray();
        const [users, solveHistories, profiles, batches] = await Promise.all([
            read(collections.users), read(collections.solveHistories),
            read(collections.profiles), read(collections.batches),
        ]);
        return { users, solveHistories, profiles, batches };
    } catch (error) {
        const safe = new Error(`MongoDB read failed${error?.code ? ` (${error.code})` : ''}: ${error?.name || 'Error'}`);
        safe.code = 'MONGO_READ_FAILED';
        throw safe;
    } finally {
        await connection.close().catch(() => {});
    }
}

/** Resolve a legacy question reference (legacy id, slug, or `slug/`) to a content_refs id. */
export function buildContentResolver(refRows) {
    const byId = new Map();
    const byLegacy = new Map();
    const bySlug = new Map();
    for (const row of refRows) {
        byId.set(row.id, row.id);
        if (row.legacy_id) byLegacy.set(row.legacy_id, row.id);
        if (row.slug) bySlug.set(row.slug, row.id);
    }
    return (ref) => {
        const raw = idOf(ref && typeof ref === 'object' && !ref._bsontype ? (ref._id ?? ref.id ?? ref.slug) : ref);
        if (!raw) return null;
        return byId.get(raw) ?? byLegacy.get(raw) ?? bySlug.get(normalizeSlug(raw)) ?? null;
    };
}

function newReport(dryRun) {
    const section = () => ({ source: 0, inserted: 0, existing: 0, archived: 0 });
    return {
        dryRun,
        catalog: null,
        users: section(),
        profiles: section(),
        progress: section(),
        attempts: { source: 0, inserted: 0, existing: 0, archived: 0, missingTimestamp: 0 },
        batches: section(),
        items: section(),
        orphans: [],
        orphansTruncated: 0,
    };
}

export function mapUser(doc) {
    const email = typeof doc.email === 'string' ? doc.email.trim().toLowerCase() || null : null;
    return {
        id: idOf(doc._id),
        first_name: doc.firstName ?? null,
        last_name: doc.lastName ?? null,
        email,
        google_id: doc.googleId ? String(doc.googleId) : null,
        role: doc.role === 'admin' ? 'admin' : 'user',
        picture: doc.picture ?? null,
        // Omitted (→ column default) rather than null when Mongo has no date.
        created_at: toDate(doc.createdAt) ?? doc._id?.getTimestamp?.() ?? undefined,
    };
}

/** content_progress row plus attempts for one legacy SolveHistory document. */
export function mapProgress(doc, contentId) {
    const progressId = idOf(doc._id);
    const userId = idOf(doc.userId);
    const events = Array.isArray(doc.solveHistory) ? doc.solveHistory : [];
    const lastUpdatedAt = toDate(doc.lastUpdatedAt);
    const firstSolvedAt = toDate(doc.firstSolvedAt);
    let missingTimestamp = 0;
    const attempts = events.map((event, index) => {
        const solvedAt = toDate(event?.solvedAt);
        if (!solvedAt) missingTimestamp += 1;
        const eventId = idOf(event?._id);
        return {
            id: eventId ? `legacy:${eventId}` : `legacy:${progressId}:${index}`,
            user_id: userId,
            content_id: contentId,
            success: event?.success !== false,
            occurred_at: solvedAt ?? lastUpdatedAt ?? firstSolvedAt ?? new Date(0),
            time_spent: toNumber(event?.timeSpent),
            context: toPlain(event?.sessionContext) ?? {},
        };
    });
    const solveCount = Math.max(0, Math.round(toNumber(doc.solveCount) ?? 0));
    const successes = attempts.filter((a) => a.success).map((a) => a.occurred_at);
    const lastEvent = maxDate(...attempts.map((a) => a.occurred_at));
    const rating = toNumber(doc.difficulty_rating);
    return {
        missingTimestamp,
        attempts,
        row: {
            id: progressId,
            user_id: userId,
            content_id: contentId,
            solve_count: solveCount,
            attempt_count: Math.max(solveCount, attempts.length),
            first_solved_at: firstSolvedAt ?? (successes.length ? successes.reduce((a, b) => (b < a ? b : a)) : null),
            last_solved_at: solveCount > 0 || successes.length ? (lastUpdatedAt ?? maxDate(...successes)) : null,
            last_attempt_at: maxDate(lastEvent, lastUpdatedAt),
            average_time_to_solve: toNumber(doc.averageTimeToSolve),
            timed_solve_count: solveCount > 0 && toNumber(doc.averageTimeToSolve) !== null ? 1 : 0,
            difficulty_rating: rating !== null && rating >= 1 && rating <= 5 ? Math.round(rating) : null,
            note: doc.note ?? null,
            tags: Array.isArray(doc.tags) ? doc.tags.filter((t) => typeof t === 'string') : [],
        },
    };
}

/** Batch header (data = everything except identity and normalized items). */
export function mapBatch(doc) {
    const plain = toPlain(doc);
    const dateText = typeof doc.date === 'string' ? doc.date : toPlain(doc.date);
    return {
        id: idOf(doc._id),
        user_id: idOf(doc.userId),
        batch_date: /^\d{4}-\d{2}-\d{2}/.test(dateText || '') ? dateText.slice(0, 10) : null,
        data: without(plain, ['_id', '__v', 'userId', 'date', 'recommendations']),
        created_at: toDate(doc.createdAt) ?? toDate(doc.generatedAt),
        updated_at: toDate(doc.updatedAt) ?? toDate(doc.generatedAt),
    };
}

async function insertRow(client, table, row, { conflict = 'DO NOTHING', jsonCols = [] } = {}) {
    const cols = Object.keys(row).filter((c) => row[c] !== undefined);
    const values = cols.map((c) => (jsonCols.includes(c) ? JSON.stringify(row[c]) : row[c]));
    const placeholders = cols.map((c, i) => `$${i + 1}`);
    const res = await client.query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT ${conflict}`,
        values,
    );
    return res.rowCount === 1;
}

/**
 * Run the import inside a transaction on `client`. Exposed for tests; prefer
 * importMongoToPostgres. Returns the report.
 */
export async function importSnapshot(client, snapshot, { dryRun = true, catalogItems } = {}) {
    const report = newReport(dryRun);
    await client.query("SELECT pg_advisory_xact_lock(hashtext('prepalgo:mongo-import:' || current_schema()))");
    await assertSchemaReady(client);
    report.catalog = await syncContentCatalog(client, catalogItems ? { items: catalogItems } : undefined);

    const { rows: [run] } = await client.query(
        'INSERT INTO legacy_import_runs (source, summary) VALUES ($1, $2) RETURNING id',
        [SOURCE, JSON.stringify({ dryRun })],
    );

    const archive = async (collection, sourceId, reason, raw, section, extra = {}) => {
        const key = `${collection}:${sourceId}${extra.suffix ? `:${extra.suffix}` : ''}`;
        await client.query(
            `INSERT INTO legacy_import_orphans (id, source_collection, source_id, reason, raw, first_seen_run)
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
            [key, collection, String(sourceId), reason, JSON.stringify(toPlain(raw)), run.id],
        );
        if (section) report[section].archived += 1;
        if (report.orphans.length < MAX_REPORT_ENTRIES) {
            report.orphans.push({ collection, id: String(sourceId), reason, ...extra.details });
        } else {
            report.orphansTruncated += 1;
        }
    };

    const { rows: refRows } = await client.query('SELECT id, slug, legacy_id FROM content_refs');
    const resolveContent = buildContentResolver(refRows);

    // Users: preserve ids (including synthetic test ids). Never invent identities.
    for (const doc of snapshot.users || []) {
        report.users.source += 1;
        const row = mapUser(doc);
        if (!row.id || !row.google_id) {
            await archive('users', row.id ?? 'unknown', row.id ? 'missing_google_id' : 'missing_id', doc, 'users');
            continue;
        }
        if (await insertRow(client, 'users', row)) {
            report.users.inserted += 1;
            continue;
        }
        const { rows: [same] } = await client.query('SELECT 1 FROM users WHERE id = $1', [row.id]);
        if (same) report.users.existing += 1;
        else await archive('users', row.id, 'identity_conflict_email_or_google_id', doc, 'users');
    }

    const referencedUsers = new Set();
    for (const list of [snapshot.solveHistories, snapshot.profiles, snapshot.batches]) {
        for (const doc of list || []) if (doc.userId != null) referencedUsers.add(idOf(doc.userId));
    }
    const { rows: present } = await client.query('SELECT id FROM users WHERE id = ANY($1::text[])', [[...referencedUsers]]);
    const userExists = new Set(present.map((r) => r.id));

    const profileUsers = new Set();
    for (const doc of snapshot.profiles || []) {
        report.profiles.source += 1;
        const userId = idOf(doc.userId);
        const sourceId = idOf(doc._id) ?? userId;
        if (!userId || !userExists.has(userId)) {
            await archive('userprofiles', sourceId, 'unknown_user', doc, 'profiles', { details: { userId } });
            continue;
        }
        const plain = toPlain(doc);
        const row = {
            user_id: userId,
            data: without(plain, ['_id', '__v', 'userId']),
            version: 0,
            created_at: toDate(doc.createdAt) ?? new Date(),
            updated_at: toDate(doc.updatedAt) ?? toDate(doc.lastUpdated) ?? new Date(),
        };
        if (await insertRow(client, 'user_profiles', row, { conflict: '(user_id) DO NOTHING', jsonCols: ['data'] })) {
            report.profiles.inserted += 1;
        } else if (profileUsers.has(userId)) {
            // A second Mongo profile for the same user.
            await archive('userprofiles', sourceId, 'duplicate_profile_for_user', doc, 'profiles', {
                suffix: 'duplicate', details: { userId },
            });
        } else {
            report.profiles.existing += 1;
        }
        profileUsers.add(userId);
    }

    const progressKeys = new Map();
    for (const doc of snapshot.solveHistories || []) {
        report.progress.source += 1;
        const events = Array.isArray(doc.solveHistory) ? doc.solveHistory.length : 0;
        report.attempts.source += events;
        const progressId = idOf(doc._id);
        const userId = idOf(doc.userId);
        const questionRef = idOf(doc.questionId);
        const contentId = resolveContent(doc.questionId);
        let reason = null;
        if (!progressId) reason = 'missing_id';
        else if (!userId || !userExists.has(userId)) reason = 'unknown_user';
        else if (!contentId) reason = 'unknown_content';
        else if (progressKeys.has(`${userId}\u0000${contentId}`)) reason = 'duplicate_progress_for_content';
        if (reason) {
            await archive('solvehistories', progressId ?? 'unknown', reason, doc, 'progress', {
                details: { userId, questionId: questionRef, events },
            });
            report.attempts.archived += events;
            continue;
        }
        progressKeys.set(`${userId}\u0000${contentId}`, progressId);
        const mapped = mapProgress(doc, contentId);
        report.attempts.missingTimestamp += mapped.missingTimestamp;

        if (await insertRow(client, 'content_progress', mapped.row)) {
            report.progress.inserted += 1;
        } else {
            const { rows: [existing] } = await client.query(
                'SELECT id FROM content_progress WHERE user_id = $1 AND content_id = $2', [userId, contentId],
            );
            if (existing?.id !== progressId) {
                // The app already recorded progress for this pair; importing the
                // legacy counters/events would double count. Keep them archived.
                await archive('solvehistories', progressId, 'progress_already_exists_in_postgres', doc, 'progress', {
                    details: { userId, questionId: questionRef, events },
                });
                report.attempts.archived += events;
                continue;
            }
            report.progress.existing += 1;
        }
        for (const attempt of mapped.attempts) {
            const row = { ...attempt, source: SOURCE };
            if (await insertRow(client, 'attempts', row, { conflict: '(id) DO NOTHING', jsonCols: ['context'] })) {
                report.attempts.inserted += 1;
            } else {
                report.attempts.existing += 1;
            }
        }
    }

    for (const doc of snapshot.batches || []) {
        report.batches.source += 1;
        const recs = Array.isArray(doc.recommendations) ? doc.recommendations : [];
        report.items.source += recs.length;
        const batch = mapBatch(doc);
        let reason = null;
        if (!batch.id) reason = 'missing_id';
        else if (!batch.user_id || !userExists.has(batch.user_id)) reason = 'unknown_user';
        else if (!batch.batch_date) reason = 'invalid_date';
        if (reason) {
            await archive('dailyrecommendationbatches', batch.id ?? 'unknown', reason, doc, 'batches', {
                details: { userId: batch.user_id, items: recs.length },
            });
            report.items.archived += recs.length;
            continue;
        }

        const completions = new Map();
        for (const done of Array.isArray(doc.questionsCompleted) ? doc.questionsCompleted : []) {
            const cid = resolveContent(done?.questionId);
            if (cid && !completions.has(cid)) completions.set(cid, done);
        }
        const items = [];
        const orphanItems = [];
        const seen = new Set();
        recs.forEach((rec, position) => {
            const contentId = resolveContent(rec?.question);
            if (!contentId) orphanItems.push({ position, reason: 'unknown_content', rec });
            else if (seen.has(contentId)) orphanItems.push({ position, reason: 'duplicate_content_in_batch', rec });
            else {
                seen.add(contentId);
                const done = completions.get(contentId);
                const plainRec = toPlain(rec);
                items.push({
                    batch_id: batch.id,
                    content_id: contentId,
                    position,
                    data: { ...plainRec, question: idOf(rec.question) },
                    completed_at: toDate(done?.completedAt),
                    time_spent: toNumber(done?.timeSpent),
                    success: done ? done.success !== false : null,
                });
            }
        });

        const inserted = await insertRow(client, 'recommendation_batches', {
            ...batch,
            created_at: batch.created_at ?? new Date(),
            updated_at: batch.updated_at ?? new Date(),
            version: 0,
        }, { conflict: 'DO NOTHING', jsonCols: ['data'] });
        if (inserted) {
            report.batches.inserted += 1;
        } else {
            const { rows: [same] } = await client.query('SELECT 1 FROM recommendation_batches WHERE id = $1', [batch.id]);
            if (!same) {
                await archive('dailyrecommendationbatches', batch.id, 'batch_already_exists_for_date', doc, 'batches', {
                    details: { userId: batch.user_id, items: recs.length },
                });
                report.items.archived += recs.length;
                continue;
            }
            report.batches.existing += 1;
        }
        for (const item of items) {
            if (await insertRow(client, 'recommendation_items', item, { conflict: 'DO NOTHING', jsonCols: ['data'] })) {
                report.items.inserted += 1;
            } else {
                report.items.existing += 1;
            }
        }
        for (const orphan of orphanItems) {
            await archive('dailyrecommendationbatches', batch.id, orphan.reason, orphan.rec, 'items', {
                suffix: `item:${orphan.position}`,
                details: { position: orphan.position, questionId: idOf(orphan.rec?.question) },
            });
        }
    }

    const summary = { ...report, orphans: undefined };
    await client.query(
        'UPDATE legacy_import_runs SET finished_at = now(), summary = $2 WHERE id = $1',
        [run.id, JSON.stringify(summary)],
    );
    report.runId = dryRun ? null : Number(run.id);
    return report;
}

/**
 * Import legacy MongoDB data into the Postgres schema reachable through `pool`.
 * Defaults to a dry run (full transaction, rolled back). Pass `snapshot` to
 * skip reading Mongo (tests). Returns the report.
 */
export async function importMongoToPostgres({
    mongoUri, mongoDbName, pool, dryRun = true, snapshot, collections, catalogItems,
} = {}) {
    if (!pool) throw new Error('pool is required');
    const data = snapshot ?? await readMongoSnapshot({ mongoUri, dbName: mongoDbName, collections });
    const client = await pool.connect();
    let report;
    try {
        await client.query('BEGIN');
        report = await importSnapshot(client, data, { dryRun, catalogItems });
        if (dryRun) throw new DryRunRollback();
        await client.query('COMMIT');
        return report;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        if (error instanceof DryRunRollback) return report;
        throw error.code && /^[0-9A-Z]{5}$/.test(error.code) ? sanitizePostgresError(error, 'Import failed') : error;
    } finally {
        client.release();
    }
}

function hostOf(uri) {
    try {
        return new URL(uri).hostname || '(unknown host)';
    } catch {
        return '(unparseable)';
    }
}

function printReport(report) {
    const line = (name, s) => console.log(
        `  ${name.padEnd(10)} source=${s.source} inserted=${s.inserted} existing=${s.existing} archived=${s.archived}`
        + (s.missingTimestamp ? ` missingTimestamp=${s.missingTimestamp}` : ''),
    );
    console.log(report.dryRun ? 'DRY RUN — transaction rolled back, nothing written.' : `APPLIED — import run ${report.runId}.`);
    console.log(`  catalog    total=${report.catalog.total} upserted=${report.catalog.upserted} deactivated=${report.catalog.deactivated}`);
    for (const key of ['users', 'profiles', 'progress', 'attempts', 'batches', 'items']) line(key, report[key]);
    if (report.orphans.length) {
        console.log(`Archived to legacy_import_orphans (${report.orphans.length + report.orphansTruncated}):`);
        for (const o of report.orphans) {
            const extra = Object.entries(o).filter(([k]) => !['collection', 'id', 'reason'].includes(k))
                .map(([k, v]) => `${k}=${v}`).join(' ');
            console.log(`  - ${o.collection} ${o.id}: ${o.reason}${extra ? ` (${extra})` : ''}`);
        }
        if (report.orphansTruncated) console.log(`  ... ${report.orphansTruncated} more`);
    }
}

async function main(argv) {
    const dotenv = (await import('dotenv')).default;
    dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
    const apply = argv.includes('--apply');
    const json = argv.includes('--json');
    const dbArg = argv.find((a) => a.startsWith('--mongo-db='));

    const mongoUri = process.env.IMPORT_MONGO_URI;
    if (!mongoUri) {
        console.error('IMPORT_MONGO_URI must be set explicitly to the source MongoDB (MONGO_URI/MONGO_URI_DEV are not used).');
        process.exitCode = 1;
        return;
    }
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL (target PostgreSQL) must be set.');
        process.exitCode = 1;
        return;
    }
    console.log(`Source MongoDB host: ${hostOf(mongoUri)}`);
    console.log(`Target PostgreSQL host: ${hostOf(process.env.DATABASE_URL)}`);
    console.log(apply ? 'Mode: APPLY' : 'Mode: dry run (pass --apply to write)');

    const pool = createPostgresPool({
        applicationName: 'prepalgo-mongo-import', max: 1,
        statement_timeout: 120_000, query_timeout: 130_000,
    });
    try {
        const report = await importMongoToPostgres({
            mongoUri, mongoDbName: dbArg?.slice('--mongo-db='.length) || undefined, pool, dryRun: !apply,
        });
        if (json) console.log(JSON.stringify(report, null, 2));
        else printReport(report);
    } finally {
        await pool.end();
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main(process.argv.slice(2)).catch((error) => {
        console.error(sanitizePostgresError(error, 'Import failed').message);
        process.exitCode = 1;
    });
}
