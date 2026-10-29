import test, { after, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
    assertSchemaReady, buildPoolConfig, contentRefFromItem, getPostgresStatus, query,
    sanitizePostgresError, syncContentCatalog, withTransaction,
} from '../config/postgres.js';
import { getMigrationStatus, loadMigrations, runMigrations } from '../scripts/migratePostgres.js';
import { importMongoToPostgres, mapProgress, toPlain } from '../scripts/importMongoToPostgres.js';
import { createTestDatabase, postgresTestSkipReason, toDirectConnectionUrl } from './helpers/postgres.js';

const CATALOG = [
    { slug: 'two-sum', legacyId: 'q-two-sum', type: 'problem', domain: 'algorithms', group: 'Arrays', difficulty: 'Easy', title: 'Two Sum' },
    { slug: 'valid-anagram', legacyId: 'q-anagram', type: 'problem', domain: 'algorithms', group: 'Arrays', difficulty: 'Easy', title: 'Valid Anagram' },
    { slug: 'caching-fundamentals', type: 'topic', domain: 'system_design', group: 'Caching', title: 'Caching' },
];

describe('pure helpers', () => {
    test('pool config verifies TLS remotely and strips URL ssl params', () => {
        const remote = buildPoolConfig('postgresql://u:p@ep-x-pooler.neon.tech/db?sslmode=require&channel_binding=require');
        assert.deepEqual(remote.ssl, { rejectUnauthorized: true });
        assert.ok(!remote.connectionString.includes('sslmode'));
        assert.ok(remote.connectionString.includes('channel_binding=require'));
        assert.equal(remote.options, undefined, 'no startup options unless a searchPath is requested');
        assert.ok(remote.max <= 10);
        assert.equal(buildPoolConfig('postgres://u:p@localhost:5432/db').ssl, false);
        assert.throws(() => buildPoolConfig('postgres://u:p@db.example.com/db?sslmode=disable'), { code: 'PG_TLS_REQUIRED' });
        assert.throws(() => buildPoolConfig(undefined), { code: 'PG_NOT_CONFIGURED' });
        assert.throws(() => buildPoolConfig('mysql://x'), { code: 'PG_INVALID_URL' });
        assert.equal(buildPoolConfig('postgres://localhost/db', { searchPath: 'pa_test_x' }).options, '-c search_path=pa_test_x');
        assert.throws(() => buildPoolConfig('postgres://localhost/db', { searchPath: 'x;drop' }));
    });

    test('errors are sanitized but keep their code', () => {
        const raw = Object.assign(new Error('failed for postgresql://user:secret@host/db password=hunter2'), { code: '23505', constraint: 'users_email_key' });
        const safe = sanitizePostgresError(raw);
        assert.equal(safe.code, '23505');
        assert.equal(safe.constraint, 'users_email_key');
        assert.ok(!safe.message.includes('secret'));
        assert.ok(!safe.message.includes('hunter2'));
    });

    test('status is cheap and reports disabled before use', () => {
        assert.equal(typeof getPostgresStatus().status, 'string');
    });

    test('content ref id is the legacy id when present, else the slug', () => {
        assert.equal(contentRefFromItem(CATALOG[0]).id, 'q-two-sum');
        assert.equal(contentRefFromItem({ slug: 'abc/' }).id, 'abc');
    });

    test('neon pooler hosts map to the direct endpoint for tests', () => {
        assert.equal(
            new URL(toDirectConnectionUrl('postgresql://u:p@ep-cool-1-pooler.us-east-2.aws.neon.tech/db?sslmode=require')).hostname,
            'ep-cool-1.us-east-2.aws.neon.tech',
        );
    });

    test('legacy events without _id get deterministic index ids; counters preserved', () => {
        const doc = {
            _id: 'p1', userId: 'u1', questionId: 'q', solveCount: 3,
            lastUpdatedAt: new Date('2024-02-01T00:00:00Z'), firstSolvedAt: new Date('2024-01-01T00:00:00Z'),
            solveHistory: [{ solvedAt: new Date('2024-01-01T00:00:00Z'), success: true }, { _id: 'e2', success: false }],
        };
        const a = mapProgress(doc, 'q');
        const b = mapProgress(doc, 'q');
        assert.deepEqual(a.attempts.map((x) => x.id), ['legacy:p1:0', 'legacy:e2']);
        assert.deepEqual(a.attempts.map((x) => x.id), b.attempts.map((x) => x.id));
        assert.equal(a.row.solve_count, 3);
        assert.equal(a.row.attempt_count, 3);
        assert.equal(a.missingTimestamp, 1);
        assert.equal(toPlain({ d: new Date('2024-01-01T00:00:00Z') }).d, '2024-01-01T00:00:00.000Z');
    });

    test('migration files load with checksums', async () => {
        const migrations = await loadMigrations();
        assert.ok(migrations.length >= 1);
        assert.equal(migrations[0].version, '001');
    });
});

describe('postgres integration (isolated schema)', { skip: postgresTestSkipReason() }, () => {
    let db;
    before(async () => {
        db = await createTestDatabase({ catalogItems: CATALOG });
    });
    after(async () => {
        await db?.close();
    });

    test('runs in a non-public schema and is ready', async () => {
        const { rows: [{ schema }] } = await query('SELECT current_schema() AS schema');
        assert.equal(schema, db.schema);
        assert.notEqual(schema, 'public');
        await assertSchemaReady();
    });

    test('migrations are idempotent and detect edited files', async () => {
        const again = await runMigrations({ pool: db.pool, catalogItems: CATALOG });
        assert.deepEqual(again.applied, []);
        assert.deepEqual((await getMigrationStatus({ pool: db.pool })).pending, []);
        await db.query("UPDATE schema_migrations SET checksum = 'tampered' WHERE version = '001'");
        await assert.rejects(runMigrations({ pool: db.pool, catalogItems: CATALOG }), /checksum mismatch/);
        const [m] = await loadMigrations();
        await db.query('UPDATE schema_migrations SET checksum = $1 WHERE version = $2', [m.checksum, m.version]);
    });

    test('an older release tolerates newer applied migrations, not divergent ones', async () => {
        const [first, ...rest] = await loadMigrations();
        assert.ok(rest.length >= 1, 'needs at least two migrations');
        const dir = await mkdtemp(path.join(tmpdir(), 'pa-migrations-'));
        try {
            await writeFile(path.join(dir, first.file), first.sql);
            await assert.rejects(getMigrationStatus({ pool: db.pool, migrationsDir: dir }), /not present locally/);
            const status = await getMigrationStatus({ pool: db.pool, migrationsDir: dir, allowNewer: true });
            assert.deepEqual(status.pending, []);
            assert.deepEqual(status.newer, rest.map((m) => m.version));

            await rm(path.join(dir, first.file));
            const last = rest.at(-1);
            await writeFile(path.join(dir, last.file), last.sql);
            await assert.rejects(getMigrationStatus({ pool: db.pool, migrationsDir: dir, allowNewer: true }),
                new RegExp(`migration ${first.version} that is not present locally`));
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    test('withTransaction rolls back on error and keeps thrown errors', async () => {
        await assert.rejects(withTransaction(async (client) => {
            await client.query("INSERT INTO users (id, google_id) VALUES ('tx-user', 'g-tx')");
            throw Object.assign(new Error('boom'), { statusCode: 409 });
        }), { message: 'boom', statusCode: 409 });
        assert.equal((await query("SELECT 1 FROM users WHERE id = 'tx-user'")).rowCount, 0);
        await assert.rejects(
            query("INSERT INTO users (id, google_id, email) VALUES ('x', 'g', 'UPPER@x.com')"),
            { code: '23514' },
        );
    });

    test('catalog sync deactivates missing refs without deleting progress', async () => {
        await db.query("INSERT INTO users (id, google_id) VALUES ('sync-user', 'g-sync')");
        await db.query("INSERT INTO content_progress (id, user_id, content_id, solve_count) VALUES ('sp', 'sync-user', 'caching-fundamentals', 1)");
        const result = await syncContentCatalog(db.pool, { items: CATALOG.slice(0, 2) });
        assert.equal(result.deactivated, 1);
        const { rows: [ref] } = await db.query("SELECT active FROM content_refs WHERE id = 'caching-fundamentals'");
        assert.equal(ref.active, false);
        assert.equal((await db.query("SELECT 1 FROM content_progress WHERE id = 'sp'")).rowCount, 1);
        await assert.rejects(syncContentCatalog(db.pool, { items: [] }), { code: 'CONTENT_CATALOG_EMPTY' });
        // Slug moving to a new id (item gained a legacy id) is handled.
        await syncContentCatalog(db.pool, { items: [...CATALOG.slice(0, 2), { ...CATALOG[2], legacyId: 'q-cache' }] });
        const { rows } = await db.query("SELECT id, slug, active FROM content_refs WHERE id IN ('caching-fundamentals', 'q-cache') ORDER BY id");
        assert.deepEqual(rows, [
            { id: 'caching-fundamentals', slug: null, active: false },
            { id: 'q-cache', slug: 'caching-fundamentals', active: true },
        ]);
        await syncContentCatalog(db.pool, { items: CATALOG });
        await db.query("DELETE FROM users WHERE id = 'sync-user'");
    });

    test('mongo import: dry run, apply, orphans archived, idempotent, newer PG work kept', async () => {
        const at = (s) => new Date(s);
        const snapshot = {
            users: [
                { _id: 'test-alice-beginner-001', firstName: 'Alice', lastName: 'T', email: 'Test-Alice@Test.com', googleId: 'g-alice', role: 'user', createdAt: at('2024-01-01T00:00:00Z') },
                { _id: 'test-bob-intermediate-002', firstName: 'Bob', lastName: 'T', email: 'bob@test.com', googleId: 'g-bob' },
                { _id: 'no-google', firstName: 'N', lastName: 'G', email: 'ng@test.com' },
            ],
            profiles: [
                { _id: 'prof-a', userId: 'test-alice-beginner-001', adaptiveWeights: { spaced_repetition: 0.2 }, lastUpdated: at('2024-03-01T00:00:00Z') },
                { _id: 'prof-ghost', userId: 'deleted-user', adaptiveWeights: {} },
            ],
            solveHistories: [
                {
                    _id: 'sh-1', userId: 'test-alice-beginner-001', questionId: 'q-two-sum', solveCount: 2,
                    firstSolvedAt: at('2024-01-02T00:00:00Z'), lastUpdatedAt: at('2024-01-05T00:00:00Z'), tags: ['review'],
                    solveHistory: [
                        { _id: 'ev-1', solvedAt: at('2024-01-02T00:00:00Z'), success: true, timeSpent: 12, sessionContext: { timeOfDay: 'morning' } },
                        { solvedAt: at('2024-01-05T00:00:00Z'), success: true },
                    ],
                },
                { _id: 'sh-2', userId: 'test-alice-beginner-001', questionId: 'caching-fundamentals/', solveCount: 1, solveHistory: [{ _id: 'ev-3', solvedAt: at('2024-01-06T00:00:00Z') }] },
                { _id: 'sh-unknown-content', userId: 'test-alice-beginner-001', questionId: 'gone-question', solveCount: 1, solveHistory: [{ _id: 'ev-4' }] },
                { _id: 'sh-unknown-user', userId: 'deleted-user', questionId: 'q-two-sum', solveCount: 1, solveHistory: [] },
                { _id: 'sh-bob', userId: 'test-bob-intermediate-002', questionId: 'q-anagram', solveCount: 1, solveHistory: [{ _id: 'ev-5', solvedAt: at('2024-01-07T00:00:00Z') }] },
            ],
            batches: [{
                _id: 'batch-1', userId: 'test-alice-beginner-001', date: '2024-01-05',
                expiresAt: at('2024-01-06T06:00:00Z'), analysis: { userLevel: 'beginner' },
                recommendations: [
                    { question: 'q-two-sum', reason: 'r', priority: 'high', strategy: 'spaced_repetition' },
                    { question: 'gone-question', reason: 'r', priority: 'low', strategy: 'topic_exploration' },
                    { question: 'q-anagram', reason: 'r', priority: 'medium', strategy: 'general_practice' },
                ],
                questionsCompleted: [{ questionId: 'q-two-sum', completedAt: at('2024-01-05T01:00:00Z'), timeSpent: 9, success: true }],
            }],
        };
        const counts = async () => Object.fromEntries(await Promise.all(
            ['users', 'user_profiles', 'content_progress', 'attempts', 'recommendation_batches', 'recommendation_items', 'legacy_import_orphans']
                .map(async (t) => [t, Number((await db.query(`SELECT count(*) FROM ${t}`)).rows[0].count)]),
        ));
        const before = await counts();

        const dry = await importMongoToPostgres({ pool: db.pool, snapshot, catalogItems: CATALOG });
        assert.equal(dry.dryRun, true);
        assert.equal(dry.users.inserted, 2);
        assert.deepEqual(await counts(), before, 'dry run must not write');

        // The app already has Bob's anagram progress (different id): keep it.
        await db.query("INSERT INTO users (id, google_id, email) VALUES ('test-bob-intermediate-002', 'g-bob', 'bob@test.com')");
        await db.query("INSERT INTO content_progress (id, user_id, content_id, solve_count, attempt_count) VALUES ('pg-bob', 'test-bob-intermediate-002', 'q-anagram', 7, 7)");

        const report = await importMongoToPostgres({ pool: db.pool, snapshot, dryRun: false, catalogItems: CATALOG });
        assert.equal(report.users.inserted, 1);
        assert.equal(report.users.existing, 1);
        assert.equal(report.users.archived, 1);
        assert.equal(report.profiles.inserted, 1);
        assert.equal(report.profiles.archived, 1);
        assert.equal(report.progress.inserted, 2);
        assert.equal(report.progress.archived, 3);
        assert.equal(report.attempts.inserted, 3);
        assert.equal(report.attempts.source, 5);
        assert.equal(report.attempts.inserted + report.attempts.archived, 5);
        assert.equal(report.items.inserted, 2);
        assert.equal(report.items.archived, 1);
        const reasons = report.orphans.map((o) => `${o.collection}:${o.id}:${o.reason}`).sort();
        assert.deepEqual(reasons, [
            'dailyrecommendationbatches:batch-1:unknown_content',
            'solvehistories:sh-bob:progress_already_exists_in_postgres',
            'solvehistories:sh-unknown-content:unknown_content',
            'solvehistories:sh-unknown-user:unknown_user',
            'userprofiles:prof-ghost:unknown_user',
            'users:no-google:missing_google_id',
        ]);
        assert.ok(!JSON.stringify(report).includes('@'), 'report must not contain emails');

        const { rows: [alice] } = await db.query("SELECT email FROM users WHERE id = 'test-alice-beginner-001'");
        assert.equal(alice.email, 'test-alice@test.com');
        const { rows: [p] } = await db.query("SELECT * FROM content_progress WHERE id = 'sh-1'");
        assert.equal(p.solve_count, 2);
        assert.equal(p.attempt_count, 2);
        assert.deepEqual(p.tags, ['review']);
        const { rows: ids } = await db.query("SELECT id, source, context FROM attempts WHERE user_id = 'test-alice-beginner-001' ORDER BY id");
        assert.deepEqual(ids.map((r) => r.id), ['legacy:ev-1', 'legacy:ev-3', 'legacy:sh-1:1']);
        assert.equal(ids[0].source, 'mongo_import');
        assert.deepEqual(ids[0].context, { timeOfDay: 'morning' });
        const { rows: [bob] } = await db.query("SELECT solve_count FROM content_progress WHERE user_id = 'test-bob-intermediate-002'");
        assert.equal(bob.solve_count, 7);
        const { rows: [batch] } = await db.query("SELECT batch_date::text, data FROM recommendation_batches WHERE id = 'batch-1'");
        assert.equal(batch.batch_date, '2024-01-05');
        assert.equal(batch.data.expiresAt, '2024-01-06T06:00:00.000Z');
        assert.equal(batch.data.recommendations, undefined);
        const { rows: items } = await db.query("SELECT content_id, position, data, completed_at, success FROM recommendation_items ORDER BY position");
        assert.deepEqual(items.map((i) => [i.content_id, i.position]), [['q-two-sum', 0], ['q-anagram', 2]]);
        assert.equal(items[0].data.question, 'q-two-sum');
        assert.equal(items[0].success, true);
        assert.equal(items[1].completed_at, null);
        const { rows: [prof] } = await db.query("SELECT data FROM user_profiles WHERE user_id = 'test-alice-beginner-001'");
        assert.equal(prof.data.lastUpdated, '2024-03-01T00:00:00.000Z');
        assert.equal(prof.data.userId, undefined);
        const { rows: [orphan] } = await db.query("SELECT raw FROM legacy_import_orphans WHERE id = 'solvehistories:sh-unknown-content'");
        assert.equal(orphan.raw.questionId, 'gone-question');

        // Newer PG work after the import must survive a re-run, and nothing duplicates.
        await db.query("UPDATE content_progress SET solve_count = 9 WHERE id = 'sh-1'");
        const afterFirst = await counts();
        const rerun = await importMongoToPostgres({ pool: db.pool, snapshot, dryRun: false, catalogItems: CATALOG });
        assert.equal(rerun.users.inserted + rerun.progress.inserted + rerun.attempts.inserted + rerun.items.inserted + rerun.batches.inserted + rerun.profiles.inserted, 0);
        assert.deepEqual(await counts(), afterFirst);
        assert.equal((await db.query("SELECT solve_count FROM content_progress WHERE id = 'sh-1'")).rows[0].solve_count, 9);
        assert.equal(Number((await db.query('SELECT count(*) FROM legacy_import_runs WHERE finished_at IS NOT NULL')).rows[0].count), 2);
    });
});
