import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    breakingChanges, lintMigrations, loadMigrations, rollbackProblems, schemaPolicy, SCHEMA_LABEL,
} from './rollback.mjs';

const revision = ({ env = ['DATABASE_URL'], schema, ready = 'True' } = {}) => ({
    metadata: { name: 'rev-1', labels: schema ? { [SCHEMA_LABEL]: schema } : {} },
    spec: { containers: [{ env: env.map((name) => ({ name })) }] },
    status: { conditions: [{ type: 'Ready', status: ready }] },
});
const m = (version, sql) => ({ file: `${version}_x.sql`, version, sql });

test('checked-in migrations are rollback-compatible', () => {
    const migrations = loadMigrations();
    assert.ok(migrations.length >= 2);
    assert.deepEqual(lintMigrations(migrations), []);
    assert.equal(schemaPolicy(migrations).latest, migrations.at(-1).version);
});

test('additive changes pass; breaking changes are detected', () => {
    assert.deepEqual(breakingChanges(`ALTER TABLE t ADD COLUMN c integer NOT NULL DEFAULT 0;
        CREATE INDEX i ON t (c); DROP INDEX old_i; -- DROP TABLE t in a comment`), []);
    for (const sql of [
        'DROP TABLE users;',
        'ALTER TABLE t DROP COLUMN c;',
        'ALTER TABLE t RENAME COLUMN a TO b;',
        'ALTER TABLE t ALTER COLUMN c TYPE bigint;',
        'ALTER TABLE t ALTER COLUMN c SET NOT NULL;',
        'ALTER TABLE t ADD COLUMN c integer NOT NULL;',
    ]) assert.notDeepEqual(breakingChanges(sql), [], sql);
});

test('breaking migrations must be marked as contract steps, which raise the floor', () => {
    const base = m('001', 'CREATE TABLE t (a int); DROP TABLE IF EXISTS old;');
    assert.deepEqual(lintMigrations([base, m('002', 'ALTER TABLE t ADD COLUMN b int;')]), []);
    assert.match(lintMigrations([base, m('002', 'ALTER TABLE t DROP COLUMN a;')])[0], /002_x\.sql: drops/);
    const marked = [base, m('002', '-- prepalgo:contract\nALTER TABLE t DROP COLUMN a;'), m('003', 'SELECT 1;')];
    assert.deepEqual(lintMigrations(marked), []);
    assert.deepEqual(schemaPolicy(marked), { latest: '003', floor: '002' });
});

test('rollback targets must be PostgreSQL revisions at or above the schema floor', () => {
    const open = { latest: '002', floor: '000' };
    assert.deepEqual(rollbackProblems(revision(), open), []);
    assert.match(rollbackProblems(revision({ env: ['MONGO_URI', 'DATABASE_URL'] }), open)[0], /MongoDB-backed/);
    assert.match(rollbackProblems(revision({ env: [] }), open)[0], /no DATABASE_URL/);
    assert.match(rollbackProblems(revision({ schema: '003' }), open)[0], /newer than this checkout/);
    assert.match(rollbackProblems(revision({ ready: 'False' }), open)[0], /not Ready/);

    assert.match(rollbackProblems(revision(), { latest: '003', floor: '000' })[0], /unlabeled revision only starts on schema 002/);
    assert.deepEqual(rollbackProblems(revision({ schema: '002' }), { latest: '003', floor: '000' }), []);

    const contracted = { latest: '004', floor: '003' };
    assert.match(rollbackProblems(revision(), contracted).join(), /predates contract migration 003 \(schema unlabeled\)/);
    assert.match(rollbackProblems(revision({ schema: '002' }), contracted)[0], /predates/);
    assert.deepEqual(rollbackProblems(revision({ schema: '003' }), contracted), []);
});
