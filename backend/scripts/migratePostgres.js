import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    createPostgresPool, sanitizePostgresError, syncContentCatalog,
} from '../config/postgres.js';

/**
 * Minimal versioned SQL migration runner.
 *
 * Files in backend/migrations named `NNN_description.sql` are applied in order
 * inside a single transaction (with their schema_migrations rows and the
 * content catalog sync) under a transaction-scoped advisory lock keyed on the
 * current schema. Checksums of applied files must not change.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MIGRATIONS_DIR = path.join(HERE, '..', 'migrations');
const FILE_PATTERN = /^(\d{3,})_([a-z0-9_]+)\.sql$/;

export async function loadMigrations(dir = DEFAULT_MIGRATIONS_DIR) {
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    const migrations = [];
    for (const file of files) {
        const match = FILE_PATTERN.exec(file);
        if (!match) throw new Error(`Invalid migration file name: ${file}`);
        const sql = await readFile(path.join(dir, file), 'utf8');
        migrations.push({
            version: match[1],
            name: match[2],
            file,
            sql,
            checksum: createHash('sha256').update(sql).digest('hex'),
        });
    }
    const versions = new Set();
    for (const m of migrations) {
        if (versions.has(m.version)) throw new Error(`Duplicate migration version ${m.version}`);
        versions.add(m.version);
    }
    return migrations;
}

async function readApplied(client) {
    const { rows: [{ exists }] } = await client.query(
        "SELECT to_regclass('schema_migrations') IS NOT NULL AS exists",
    );
    if (!exists) return new Map();
    const { rows } = await client.query('SELECT version, checksum FROM schema_migrations ORDER BY version');
    return new Map(rows.map((r) => [r.version, r.checksum]));
}

// `allowNewer` lets an older release start after a newer, backward-compatible
// migration was applied (a rollback); unknown versions inside the local range
// still fail because they mean divergent histories.
function verifyChecksums(migrations, applied, { allowNewer = false } = {}) {
    const known = new Map(migrations.map((m) => [m.version, m]));
    const latest = migrations.at(-1)?.version ?? '';
    const newer = [];
    for (const [version, checksum] of applied) {
        const m = known.get(version);
        if (!m && allowNewer && version.localeCompare(latest, 'en', { numeric: true }) > 0) {
            newer.push(version);
            continue;
        }
        if (!m) throw new Error(`Database has migration ${version} that is not present locally`);
        if (m.checksum !== checksum) {
            throw new Error(`Migration ${m.file} was modified after being applied (checksum mismatch)`);
        }
    }
    return newer;
}

/**
 * Read-only: which migrations are applied and pending, plus (with `allowNewer`)
 * applied versions newer than this release knows about.
 */
export async function getMigrationStatus({ pool, migrationsDir, allowNewer = false } = {}) {
    const migrations = await loadMigrations(migrationsDir);
    const applied = await readApplied(pool);
    const newer = verifyChecksums(migrations, applied, { allowNewer });
    return {
        applied: migrations.filter((m) => applied.has(m.version)).map((m) => m.file),
        pending: migrations.filter((m) => !applied.has(m.version)).map((m) => m.file),
        newer,
    };
}

/**
 * Apply pending migrations and (unless `syncCatalog` is false) sync the content
 * catalog. Returns `{ applied: [file], catalog: {total, upserted, deactivated} | null }`.
 */
export async function runMigrations({
    pool, migrationsDir, syncCatalog = true, catalogItems, log = () => {},
} = {}) {
    if (!pool) throw new Error('runMigrations requires a pool');
    const migrations = await loadMigrations(migrationsDir);
    const client = await pool.connect();
    try {
        // One transaction with a transaction-scoped advisory lock: safe behind
        // transaction-pooling proxies (Neon pooler/PgBouncer), and either every
        // pending migration plus the catalog sync lands or nothing does.
        await client.query('BEGIN');
        await client.query("SELECT pg_advisory_xact_lock(hashtext('prepalgo:migrations:' || current_schema()))");
        await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
            version    text PRIMARY KEY,
            name       text NOT NULL,
            checksum   text NOT NULL,
            applied_at timestamptz NOT NULL DEFAULT now()
        )`);
        const applied = await readApplied(client);
        verifyChecksums(migrations, applied);

        const newlyApplied = [];
        for (const m of migrations) {
            if (applied.has(m.version)) continue;
            log(`Applying ${m.file}`);
            try {
                await client.query(m.sql);
            } catch (error) {
                throw sanitizePostgresError(error, `Migration ${m.file} failed`);
            }
            await client.query(
                'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
                [m.version, m.name, m.checksum],
            );
            newlyApplied.push(m.file);
        }

        let catalog = null;
        if (syncCatalog) {
            catalog = await syncContentCatalog(client, catalogItems ? { items: catalogItems } : undefined);
        }
        await client.query('COMMIT');
        if (catalog) {
            log(`Content catalog synced: ${catalog.total} items, ${catalog.upserted} upserted, ${catalog.deactivated} deactivated`);
        }
        return { applied: newlyApplied, catalog };
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

async function main(argv) {
    const dotenv = (await import('dotenv')).default;
    dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
    const statusOnly = argv.includes('--status');
    const skipCatalog = argv.includes('--skip-catalog');

    const pool = createPostgresPool({ applicationName: 'prepalgo-migrate', max: 1 });
    try {
        if (statusOnly) {
            const status = await getMigrationStatus({ pool });
            console.log(`Applied: ${status.applied.length ? status.applied.join(', ') : '(none)'}`);
            console.log(`Pending: ${status.pending.length ? status.pending.join(', ') : '(none)'}`);
            return;
        }
        const result = await runMigrations({ pool, syncCatalog: !skipCatalog, log: (m) => console.log(m) });
        console.log(result.applied.length
            ? `Applied ${result.applied.length} migration(s).`
            : 'Schema is up to date.');
    } finally {
        await pool.end();
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main(process.argv.slice(2)).catch((error) => {
        console.error(sanitizePostgresError(error, 'Migration failed').message);
        process.exitCode = 1;
    });
}
