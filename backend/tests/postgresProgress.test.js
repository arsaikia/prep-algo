import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import dotenv from 'dotenv';
import pg from 'pg';
import express from 'express';
import { once } from 'node:events';
import { submitMcqAnswer } from '../controller/questionController.js';
import { submitMcqSchema } from '../schemas/code.js';
import { validate } from '../middleware/validate.js';
import { gradeQuiz, listItems } from '../utils/contentStore.js';
import { getPool, disconnectPostgres } from '../config/postgres.js';
import {
    findSubmission, listProgress, listHistory, recordAttempt, submissionHash, updateAnnotations,
} from '../repositories/progress.js';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });
const enabled = Boolean(process.env.DATABASE_URL);
const originalDatabaseUrl = process.env.DATABASE_URL;
const schema = `test_progress_${randomUUID().replaceAll('-', '')}`;
const previousOptions = process.env.PGOPTIONS;
let admin;
let db;

before(async () => {
    if (!enabled) return;
    const url = new URL(process.env.DATABASE_URL);
    if (url.hostname.endsWith('.neon.tech')) {
        url.hostname = url.hostname.replace('-pooler.', '.');
    }
    process.env.DATABASE_URL = url.toString();
    admin = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    await admin.query(`CREATE SCHEMA "${schema}"`);
    process.env.PGOPTIONS = `-c search_path=${schema}`;
    db = getPool();
    const path = await db.query('SHOW search_path');
    assert.equal(path.rows[0].search_path, schema, 'Tests must never use public schema');
    const directory = new URL('../migrations/', import.meta.url);
    for (const file of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
        await db.query(await readFile(new URL(file, directory), 'utf8'));
    }
    await db.query(`INSERT INTO users (id,first_name,last_name,email,google_id,role)
        VALUES ('test-user','Test','User','progress-test@example.invalid','progress-google','user'),
               ('other-user','Other','User','other-test@example.invalid','other-google','user')`);
    await db.query(`INSERT INTO content_refs (id,slug,domain,type,group_name,difficulty,active)
        VALUES ('problem','test-problem','algorithms','problem','Arrays','Easy',true),
               ('quiz','test-quiz','frontend','quiz','React','Medium',true)`);
});

after(async () => {
    await disconnectPostgres();
    if (previousOptions === undefined) delete process.env.PGOPTIONS;
    else process.env.PGOPTIONS = previousOptions;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (admin) {
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.end();
    }
});

const integration = (name, fn) => test(name, { skip: !enabled && 'Set DATABASE_URL to run PostgreSQL integration tests' }, fn);
const submission = (contentId, success, key = randomUUID()) => ({
    userId: 'test-user',
    contentId,
    submissionKey: key,
    requestHash: submissionHash(contentId, { answer: key }),
    success,
    result: { solved: success },
});

integration('failed attempts are stored without marking content solved', async () => {
    const input = submission('problem', false);
    const result = await recordAttempt(input);
    assert.equal(result.attemptSaved, true);
    assert.equal(result.progressSaved, false);
    assert.equal((await listProgress('test-user')).length, 0);
    const history = await listHistory('test-user');
    assert.equal(history[0].solveCount, 0);
    assert.equal(history[0].solveHistory[0].success, false);
});

integration('concurrent retries record exactly one success and complete its daily assignment', async () => {
    const batch = randomUUID();
    await db.query(`INSERT INTO recommendation_batches (id,user_id,batch_date,data)
        VALUES ($1,'test-user',(now() AT TIME ZONE 'UTC')::date,'{}')`, [batch]);
    await db.query(`INSERT INTO recommendation_items (batch_id,content_id,position,data)
        VALUES ($1,'problem',0,'{}')`, [batch]);
    const input = submission('problem', true);
    const results = await Promise.all([recordAttempt(input), recordAttempt(input), recordAttempt(input)]);
    results.forEach(result => assert.equal(result.progressSaved, true));
    const progress = await listProgress('test-user');
    assert.equal(progress[0].solveCount, 1);
    assert.equal(progress[0].attemptCount, 2);
    const count = await db.query('SELECT count(*)::int AS count FROM attempts WHERE submission_key=$1', [input.submissionKey]);
    assert.equal(count.rows[0].count, 1);
    const profile = await db.query("SELECT data FROM user_profiles WHERE user_id='test-user'");
    assert.equal(profile.rows[0].data.recentPerformance.last10Questions.length, 2);
    const item = await db.query('SELECT completed_at,success FROM recommendation_items WHERE batch_id=$1', [batch]);
    assert.ok(item.rows[0].completed_at);
    assert.equal(item.rows[0].success, true);
    assert.deepEqual(await findSubmission(input.userId, input.submissionKey, input.contentId, input.requestHash), results[0]);
    await assert.rejects(recordAttempt({ ...input, requestHash: 'changed' }), error => error.statusCode === 409);
});

integration('a correct quiz completes an assigned item through the same transaction', async () => {
    const batch = await db.query("SELECT id FROM recommendation_batches WHERE user_id='test-user'");
    await db.query(`INSERT INTO recommendation_items (batch_id,content_id,position,data)
        VALUES ($1,'quiz',1,'{}')`, [batch.rows[0].id]);
    await recordAttempt(submission('quiz', true));
    const item = await db.query("SELECT completed_at FROM recommendation_items WHERE content_id='quiz'");
    assert.ok(item.rows[0].completed_at);
});

integration('new deliberate submissions count separately but progress stays user-isolated', async () => {
    await recordAttempt(submission('problem', true));
    assert.equal((await listProgress('test-user')).find(row => row.questionId === 'problem').solveCount, 2);
    assert.deepEqual(await listProgress('other-user'), []);
});

integration('a failed transaction leaves no partial attempt or counters', async () => {
    const input = submission('missing-content', true);
    await assert.rejects(recordAttempt(input), error => error.code === '23503');
    const attempts = await db.query('SELECT count(*)::int AS count FROM attempts WHERE submission_key=$1', [input.submissionKey]);
    assert.equal(attempts.rows[0].count, 0);
    assert.equal((await listProgress('test-user')).find(row => row.questionId === 'problem').solveCount, 2);
});

integration('annotations do not mutate solve counters', async () => {
    await updateAnnotations('test-user', 'problem', { note: 'Review', tags: ['review'], difficultyRating: 3 });
    const progress = (await listProgress('test-user')).find(row => row.questionId === 'problem');
    assert.equal(progress.note, 'Review');
    assert.deepEqual(progress.tags, ['review']);
    assert.equal(progress.solveCount, 2);
    await assert.rejects(updateAnnotations('other-user', 'problem', { note: 'Not mine' }), error => error.statusCode === 404);
    const first = await listHistory('test-user', 1);
    const second = await listHistory('test-user', 1, 0, { at: first[0].lastAttemptAt, id: first[0].questionId });
    assert.equal(second.length, 1);
    assert.notEqual(first[0].questionId, second[0].questionId);
});

integration('HTTP quiz timing persists once, rejects changed retries and detects stale grading content', async () => {
    const item = listItems().find(item => item.type === 'quiz' && item.legacyId);
    await db.query(`INSERT INTO content_refs (id,slug,domain,type,group_name,difficulty)
        VALUES ($1,$2,$3,'quiz',$4,$5)`, [item.legacyId, item.slug, item.domain, item.group, item.difficulty]);
    const correct = item.options.find(option => gradeQuiz(item.slug, option.id).passed).id;
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { _id: 'other-user' }; next(); });
    app.post('/:questionId', validate(submitMcqSchema), submitMcqAnswer);
    app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ error: error.message }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const body = { selectedOptionId: correct, submissionId: randomUUID(), timeTaken: 0, contentRevision: item.revision };
    const send = payload => fetch(`http://127.0.0.1:${server.address().port}/${item.slug}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    try {
        assert.equal((await send(body)).status, 200);
        assert.equal((await send(body)).status, 200);
        assert.equal((await send({ ...body, timeTaken: 4 })).status, 409);
        assert.equal((await send({ ...body, submissionId: randomUUID(), contentRevision: '0000000000' })).status, 409);
        assert.equal((await send({ ...body, timeTaken: -1 })).status, 400);
        const [progress] = await listProgress('other-user');
        assert.equal(progress.solveCount, 1);
        assert.equal(progress.averageTimeToSolve, 0);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
