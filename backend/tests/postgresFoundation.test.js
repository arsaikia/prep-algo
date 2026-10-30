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
});
