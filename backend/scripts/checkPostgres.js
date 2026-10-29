import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

async function checkPostgres() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('PostgreSQL check failed: DATABASE_URL is not set.');
        process.exitCode = 1;
        return;
    }

    let url;
    try {
        url = new URL(connectionString);
        if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
    } catch {
        console.error('PostgreSQL check failed: DATABASE_URL must be a PostgreSQL URL.');
        process.exitCode = 1;
        return;
    }

    if (!['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode'))) {
        console.error('PostgreSQL check failed: use the TLS connection string from Neon.');
        process.exitCode = 1;
        return;
    }

    const client = new pg.Client({
        connectionString,
        connectionTimeoutMillis: 15_000,
        query_timeout: 5_000,
        application_name: 'prepalgo-connection-check',
    });

    try {
        await client.connect();
        await client.query('SELECT 1');
        console.log('PostgreSQL connection OK: SELECT 1 succeeded. No data was changed.');
    } catch (error) {
        // Connection errors can contain credentials; emit only a standard error code.
        const code = typeof error.code === 'string' && /^[A-Z0-9_]{2,40}$/.test(error.code)
            ? ` (${error.code})`
            : '';
        console.error(`PostgreSQL connection failed${code}. Check credentials, TLS settings, and network access.`);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

checkPostgres().catch(() => {
    console.error('PostgreSQL check could not complete or close its connection.');
    process.exitCode = 1;
});
