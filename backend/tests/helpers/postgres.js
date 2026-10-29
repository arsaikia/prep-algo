import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createPostgresPool, setPoolForTesting } from '../../config/postgres.js';
import { runMigrations } from '../../scripts/migratePostgres.js';

/**
 * Integration-test database: a uniquely named schema (never `public`) in the
 * database at TEST_DATABASE_URL, migrated from scratch and dropped on close.
 * TEST_DATABASE_URL may come from the environment or backend/.env; it is never
 * inferred from DATABASE_URL. Neon `-pooler` hosts are rewritten to the direct
 * endpoint (tests only; runtime keeps the pooled URL).
 */

/**
 * Isolated schemas are selected with a `search_path` startup option, which
 * transaction poolers reject (08P01). Neon pooled hosts carry a `-pooler`
 * suffix on the endpoint label; strip it to reach the direct endpoint.
 */
export function toDirectConnectionUrl(connectionString) {
    const url = new URL(connectionString);
    const [label, ...rest] = url.hostname.split('.');
    if (label.endsWith('-pooler')) {
        url.hostname = [label.slice(0, -'-pooler'.length), ...rest].join('.');
    }
    return url.toString();
}

export function getTestDatabaseUrl() {
    if (!process.env.TEST_DATABASE_URL) {
        dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
    }
    return process.env.TEST_DATABASE_URL ? toDirectConnectionUrl(process.env.TEST_DATABASE_URL) : null;
}

/** For `test(..., { skip: postgresTestSkipReason() })`. */
export function postgresTestSkipReason() {
    return getTestDatabaseUrl() ? false : 'TEST_DATABASE_URL is not set';
}

/**
 * Create an isolated, migrated schema. Options:
 *   - installAsAppPool (default true): route config/postgres.js getPool()/query()/
 *     withTransaction() to this schema until close().
 *   - syncCatalog (default true) / catalogItems: content_refs seeding.
 * Returns { pool, schema, query, close }.
 */
export async function createTestDatabase({
    installAsAppPool = true, syncCatalog = true, catalogItems, max = 4,
} = {}) {
    const url = getTestDatabaseUrl();
    if (!url) throw new Error('TEST_DATABASE_URL is not set');
    const schema = `pa_test_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;

    const admin = createPostgresPool({ connectionString: url, max: 1, applicationName: 'prepalgo-test-admin' });
    try {
        await admin.query(`CREATE SCHEMA ${schema}`);
    } catch (error) {
        await admin.end();
        throw error;
    }

    const pool = createPostgresPool({
        connectionString: url, searchPath: schema, max, applicationName: 'prepalgo-test',
    });
    let closed = false;
    const close = async () => {
        if (closed) return;
        closed = true;
        if (installAsAppPool) setPoolForTesting(null);
        await pool.end().catch(() => {});
        try {
            await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
        } finally {
            await admin.end().catch(() => {});
        }
    };

    try {
        await runMigrations({ pool, syncCatalog, catalogItems });
    } catch (error) {
        await close();
        throw error;
    }
    if (installAsAppPool) setPoolForTesting(pool);
    return { pool, schema, query: (text, params) => pool.query(text, params), close };
}
