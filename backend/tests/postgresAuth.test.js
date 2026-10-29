import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
    createUserRepository,
    normalizeEmail,
    generateAuthToken,
    UserConflictError,
} from '../models/User.js';
import { createProtect } from '../middleware/auth.js';
import { createAuthController, isIdentityProviderUnavailable } from '../controller/authentication.js';
import { CircuitBreaker } from '../utils/circuitBreaker.js';
import { isDatabaseUnavailableError, getAllCircuitBreakerStats } from '../config/circuitBreakers.js';
import { createTestDatabase, getTestDatabaseUrl, postgresTestSkipReason } from './helpers/postgres.js';
import { app, createReadinessHandler, probePostgres } from '../server.js';
import { setPoolForTesting } from '../config/postgres.js';

// The isolated schema is selected with a search_path startup option, which
// Neon's transaction pooler rejects (08P01). Use the direct endpoint for tests.
function useDirectTestEndpoint() {
    const raw = getTestDatabaseUrl();
    if (!raw) return;
    try {
        const url = new URL(raw);
        if (url.hostname.includes('-pooler.')) {
            url.hostname = url.hostname.replace('-pooler.', '.');
            process.env.TEST_DATABASE_URL = url.toString();
        }
    } catch {
        // Leave malformed URLs for the helper to report.
    }
}

process.env.JWT_SECRET = 'test-secret-for-postgres-auth';
process.env.JWT_EXPIRE = '1h';

const passthrough = (fn) => fn();
const unavailable = () => Object.assign(new Error('PostgreSQL query failed (ECONNREFUSED)'), { code: 'ECONNREFUSED' });

function row(overrides = {}) {
    return {
        id: 'user-1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com',
        google_id: 'g-1', role: 'user', picture: null, created_at: new Date(0), ...overrides,
    };
}

function runMiddleware(mw, req) {
    return new Promise((resolve) => {
        mw(req, {}, (err) => resolve({ err, req }));
    });
}

function runHandler(handler, req) {
    return new Promise((resolve) => {
        const res = {
            statusCode: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { resolve({ res: this, body }); return this; },
        };
        handler({ body: {}, params: {}, ...req }, res, (err) => resolve({ err }));
    });
}

describe('user repository (unit)', () => {
    test('normalizes emails and rejects invalid ones', () => {
        assert.equal(normalizeEmail('  Ada@Example.COM '), 'ada@example.com');
        assert.equal(normalizeEmail('not-an-email'), null);
        assert.equal(normalizeEmail(undefined), null);
    });

    test('upsert uses parameters, lowercases email and hardcodes role', async () => {
        const calls = [];
        const repo = createUserRepository({
            runQuery: passthrough,
            query: async (text, params) => { calls.push({ text, params }); return { rows: [{ ...row(), inserted: true }] }; },
        });
        const { user, created } = await repo.upsertGoogleUser({
            googleId: 'g-1', email: 'ADA@Example.com', firstName: 'Ada', lastName: 'Lovelace', role: 'admin',
        });
        assert.equal(created, true);
        assert.equal(user._id, 'user-1');
        const [{ text, params }] = calls;
        assert.match(text, /ON CONFLICT \(google_id\)/);
        assert.match(text, /VALUES \(\$1, \$2, \$3, \$4, \$5, 'user', \$6\)/);
        assert.doesNotMatch(text, /role\s*=/);
        assert.equal(params[3], 'ada@example.com');
        assert.ok(!params.includes('admin'));
        assert.ok(!text.includes('ADA@Example.com'));
    });

    test('email owned by another Google account is a conflict, not a crash', async () => {
        const repo = createUserRepository({
            runQuery: passthrough,
            query: async () => { throw Object.assign(new Error('dup'), { code: '23505', constraint: 'users_email_key' }); },
        });
        await assert.rejects(
            repo.upsertGoogleUser({ googleId: 'g-2', email: 'ada@example.com' }),
            UserConflictError,
        );
    });

    test('unchanged picture falls back to reading the existing row', async () => {
        const repo = createUserRepository({
            runQuery: passthrough,
            query: async (text) => ({ rows: text.startsWith('INSERT') ? [] : [row()] }),
        });
        const { user, created } = await repo.upsertGoogleUser({ googleId: 'g-1', email: 'ada@example.com' });
        assert.equal(created, false);
        assert.equal(user.id, 'user-1');
    });

    test('lookups ignore non-string ids without querying', async () => {
        let queried = false;
        const repo = createUserRepository({ runQuery: passthrough, query: async () => { queried = true; return { rows: [] }; } });
        assert.equal(await repo.findById({ $ne: null }), null);
        assert.equal(queried, false);
    });
});

describe('database error classification', () => {
    test('connection failures are outages; statement errors are not', () => {
        assert.equal(isDatabaseUnavailableError(unavailable()), true);
        assert.equal(isDatabaseUnavailableError({ code: '08006' }), true);
        assert.equal(isDatabaseUnavailableError({ name: 'CircuitBreakerOpenError' }), true);
        assert.equal(isDatabaseUnavailableError({ isSanitizedPostgresError: true }), true);
        assert.equal(isDatabaseUnavailableError({ code: '23505' }), false);
        assert.equal(isDatabaseUnavailableError({ code: '22P02', isSanitizedPostgresError: true }), false);
    });

    test('breaker is named postgres and mongodb is gone', () => {
        const stats = getAllCircuitBreakerStats();
        assert.ok(stats.postgres);
        assert.equal(stats.mongodb, undefined);
    });

    test('statement errors do not trip the postgres breaker', async () => {
        const repo = createUserRepository({
            query: async () => { throw Object.assign(new Error('bad'), { code: '23505', constraint: 'users_email_key' }); },
        });
        for (let i = 0; i < 10; i++) {
            await assert.rejects(repo.upsertGoogleUser({ googleId: `g-${i}`, email: 'a@example.com' }));
        }
        assert.equal(getAllCircuitBreakerStats().postgres.state, 'CLOSED');
    });
});

describe('health probes', () => {
    test('summary and liveness never acquire a database connection', async () => {
        let acquisitions = 0;
        setPoolForTesting({ connect: async () => { acquisitions++; throw unavailable(); } });
        try {
            for (const path of ['/health', '/health/live']) {
                const handler = app._router.stack.find((layer) => layer.route?.path === path).route.stack[0].handle;
                await runHandler(handler, {});
            }
            assert.equal(acquisitions, 0);
        } finally {
            setPoolForTesting(null);
        }
    });

    test('readiness rejects an unavailable dependency despite cached healthy startup', async () => {
        const handler = createReadinessHandler({
            state: { startupComplete: true, shuttingDown: false },
            component: () => ({ status: 'ok', circuitBreaker: 'CLOSED', source: 'cached' }),
            probe: async () => { throw unavailable(); },
        });
        const { res, body } = await runHandler(handler, {});
        assert.equal(res.statusCode, 503);
        assert.equal(body.components.postgres.status, 'down');
        assert.equal(body.components.postgres.source, 'probe');
    });

    test('readiness uses current successful probe rather than stale cached down state', async () => {
        const handler = createReadinessHandler({
            state: { startupComplete: true, shuttingDown: false },
            component: () => ({ status: 'down', circuitBreaker: 'CLOSED' }),
            probe: async () => {},
        });
        const { res, body } = await runHandler(handler, {});
        assert.equal(res.statusCode, 200);
        assert.equal(body.status, 'ready');
    });

    test('readiness executes SELECT 1 with query timeout and releases the client', async () => {
        const calls = [];
        await probePostgres({
            timeoutMs: 100,
            pool: { connect: async () => ({
                query: async (config) => { calls.push(config); },
                release: (destroy) => { calls.push({ destroy }); },
            }) },
        });
        assert.deepEqual(calls, [{ text: 'SELECT 1', query_timeout: 100 }, { destroy: false }]);
    });

    test('slow pool acquisition is bounded and its late client is destroyed', async () => {
        let resolveConnect;
        let destroyed = false;
        const pending = probePostgres({
            timeoutMs: 10,
            pool: { connect: () => new Promise((resolve) => { resolveConnect = resolve; }) },
        });
        await assert.rejects(pending, /timed out/);
        resolveConnect({ release: (destroy) => { destroyed = destroy; } });
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(destroyed, true);
    });

    test('a stalled query is bounded and its client is destroyed', async () => {
        let destroyed = false;
        await assert.rejects(probePostgres({
            timeoutMs: 10,
            pool: { connect: async () => ({
                query: () => new Promise(() => {}),
                release: (destroy) => { destroyed = destroy; },
            }) },
        }), /timed out/);
        assert.equal(destroyed, true);
    });
});

describe('protect middleware', () => {
    const token = (payload = { id: 'user-1' }, opts = { expiresIn: '1h' }) => jwt.sign(payload, process.env.JWT_SECRET, opts);
    const reqWith = (t) => ({ headers: { authorization: `Bearer ${t}` } });

    test('missing, invalid and expired tokens are 401 without touching the database', async () => {
        let lookups = 0;
        const protect = createProtect({ findUserById: async () => { lookups++; return null; } });
        assert.equal((await runMiddleware(protect, { headers: {} })).err.statusCode, 401);
        assert.equal((await runMiddleware(protect, reqWith('garbage'))).err.statusCode, 401);
        const expired = (await runMiddleware(protect, reqWith(token({ id: 'user-1' }, { expiresIn: -10 })))).err;
        assert.equal(expired.statusCode, 401);
        assert.match(expired.message, /expired/);
        assert.equal((await runMiddleware(protect, reqWith(token({ sub: 'x' })))).err.statusCode, 401);
        assert.equal(lookups, 0);
    });

    test('database outage is 503, not an invalid token', async () => {
        const protect = createProtect({ findUserById: async () => { throw unavailable(); } });
        const { err } = await runMiddleware(protect, reqWith(token()));
        assert.equal(err.statusCode, 503);
    });

    test('unexpected database error is 500', async () => {
        const protect = createProtect({ findUserById: async () => { throw Object.assign(new Error('x'), { code: '42P01' }); } });
        assert.equal((await runMiddleware(protect, reqWith(token()))).err.statusCode, 500);
    });

    test('deleted user is 401; valid user is attached with _id', async () => {
        const missing = createProtect({ findUserById: async () => null });
        assert.equal((await runMiddleware(missing, reqWith(token()))).err.statusCode, 401);

        const ok = createProtect({ findUserById: async (id) => ({ _id: id, firstName: 'Ada', lastName: 'L', email: 'a@x.io', role: 'user', googleId: 'secret' }) });
        const { err, req } = await runMiddleware(ok, reqWith(token()));
        assert.equal(err, undefined);
        assert.deepEqual(req.user, { _id: 'user-1', id: 'user-1', firstName: 'Ada', lastName: 'L', email: 'a@x.io', role: 'user' });
    });
});

describe('google auth controller', () => {
    const payload = { sub: 'g-1', email: 'Ada@Example.com', email_verified: true, given_name: 'Ada', family_name: 'L' };
    const user = { _id: 'user-1', firstName: 'Ada', lastName: 'L', email: 'ada@example.com', picture: null, role: 'user' };

    test('identity provider rejection is 401; provider outage is 503', async () => {
        const rejected = createAuthController({ verifyIdToken: async () => { throw new Error('Wrong recipient'); } });
        assert.equal((await runHandler(rejected.googleAuth, { body: { token: 't' } })).err.statusCode, 401);

        const down = createAuthController({ verifyIdToken: async () => { throw Object.assign(new Error('x'), { code: 'ETIMEDOUT' }); } });
        assert.equal((await runHandler(down.googleAuth, { body: { token: 't' } })).err.statusCode, 503);
        assert.equal(isIdentityProviderUnavailable(new CircuitBreaker({ name: 'n' }) && { name: 'CircuitBreakerOpenError' }), true);
    });

    test('unverified email is rejected', async () => {
        const c = createAuthController({ verifyIdToken: async () => ({ ...payload, email_verified: false }) });
        assert.equal((await runHandler(c.googleAuth, { body: { token: 't' } })).err.statusCode, 401);
    });

    test('database outage during sign-in is 503, not 401', async () => {
        const c = createAuthController({
            verifyIdToken: async () => payload,
            users: { upsertGoogleUser: async () => { throw unavailable(); } },
        });
        assert.equal((await runHandler(c.googleAuth, { body: { token: 't' } })).err.statusCode, 503);
    });

    test('email conflict is 409', async () => {
        const c = createAuthController({
            verifyIdToken: async () => payload,
            users: { upsertGoogleUser: async () => { throw new UserConflictError('taken'); } },
        });
        assert.equal((await runHandler(c.googleAuth, { body: { token: 't' } })).err.statusCode, 409);
    });

    test('success keeps the _id/userId/token contract and ignores body role', async () => {
        let received;
        const c = createAuthController({
            verifyIdToken: async () => payload,
            users: { upsertGoogleUser: async (input) => { received = input; return { user, created: true }; } },
        });
        const { res, body } = await runHandler(c.googleAuth, { body: { token: 't', role: 'admin' } });
        assert.equal(res.statusCode, 200);
        assert.equal(body.success, true);
        assert.equal(body.data._id, 'user-1');
        assert.equal(body.data.userId, 'user-1');
        assert.equal(jwt.verify(body.data.token, process.env.JWT_SECRET).id, 'user-1');
        assert.equal('role' in received, false);
    });

    test('getUserById: 404, 503 and public shape', async () => {
        const missing = createAuthController({ users: { findById: async () => null } });
        assert.equal((await runHandler(missing.getUserById, { params: { id: 'x' } })).err.statusCode, 404);
        const down = createAuthController({ users: { findById: async () => { throw unavailable(); } } });
        assert.equal((await runHandler(down.getUserById, { params: { id: 'x' } })).err.statusCode, 503);
        const ok = createAuthController({ users: { findById: async () => ({ ...user, googleId: 'g' }) } });
        const { body } = await runHandler(ok.getUserById, { params: { id: 'user-1' } });
        assert.deepEqual(body.user, { id: 'user-1', firstName: 'Ada', lastName: 'L', email: 'ada@example.com', picture: null });
    });
});

describe('user repository against PostgreSQL', { skip: postgresTestSkipReason() }, () => {
    let db;
    let users;

    before(async () => {
        useDirectTestEndpoint();
        db = await createTestDatabase({ syncCatalog: false });
        users = createUserRepository({ query: db.query });
    });
    after(async () => { await db?.close(); });

    test('readiness probe succeeds against the isolated PostgreSQL pool', async () => {
        await probePostgres({ pool: db.pool });
    });

    test('preserves imported ids (UUID and legacy synthetic) on sign-in', async () => {
        await db.query(
            `INSERT INTO users (id, first_name, last_name, email, google_id, role)
             VALUES ('test-user-001', 'Test', 'User', 'test1@example.com', 'synthetic-google-1', 'admin'),
                    ('6f1c1f7e-2b9d-4c41-9a4e-6b8a0f3e2c11', 'Uu', 'Id', 'uuid@example.com', 'g-uuid', 'user')`,
        );
        const legacy = await users.upsertGoogleUser({ googleId: 'synthetic-google-1', email: 'TEST1@example.com', picture: 'p.png' });
        assert.equal(legacy.created, false);
        assert.equal(legacy.user._id, 'test-user-001');
        assert.equal(legacy.user.role, 'admin', 'sign-in must not reset an existing role');
        assert.equal(legacy.user.picture, 'p.png');

        const again = await users.upsertGoogleUser({ googleId: 'g-uuid', email: 'uuid@example.com' });
        assert.equal(again.user._id, '6f1c1f7e-2b9d-4c41-9a4e-6b8a0f3e2c11');
        assert.equal((await users.findById('test-user-001')).email, 'test1@example.com');
        assert.equal((await users.findByEmail('Test1@Example.com'))._id, 'test-user-001');
    });

    test('concurrent first sign-ins create exactly one user', async () => {
        const results = await Promise.all(Array.from({ length: 8 }, () => users.upsertGoogleUser({
            googleId: 'g-race', email: 'Race@Example.com', firstName: 'Race', lastName: 'Cond', picture: 'a.png',
        })));
        const ids = new Set(results.map((r) => r.user._id));
        assert.equal(ids.size, 1);
        assert.equal(results.filter((r) => r.created).length, 1);
        const { rows } = await db.query("SELECT count(*)::int AS n, min(role) AS role FROM users WHERE google_id = 'g-race'");
        assert.deepEqual(rows[0], { n: 1, role: 'user' });
    });

    test('email already linked to another Google account is a conflict', async () => {
        await assert.rejects(
            users.upsertGoogleUser({ googleId: 'g-other', email: 'race@example.com' }),
            UserConflictError,
        );
    });

    test('issued token resolves back to the stored user through protect', async () => {
        const { user } = await users.upsertGoogleUser({ googleId: 'g-jwt', email: 'jwt@example.com', firstName: 'J' });
        const protect = createProtect({ findUserById: (id) => users.findById(id) });
        const { err, req } = await runMiddleware(protect, { headers: { authorization: `Bearer ${generateAuthToken(user)}` } });
        assert.equal(err, undefined);
        assert.equal(req.user._id, user._id);
        assert.equal(req.user.role, 'user');
    });
});
