#!/usr/bin/env node
// Rules that keep Cloud Run rollback safe across PostgreSQL schema changes.
//
// Expand/contract: migrations must leave the previous release working, so the
// prior revision stays a valid rollback target. A migration that breaks older
// code (drop/rename/type change/new required column) must declare
// `-- prepalgo:contract` on its own line. That raises the rollback floor:
// revisions built before it are no longer eligible.
//
//   node scripts/release/rollback.mjs schema            print latest migration version
//   node scripts/release/rollback.mjs check < rev.json  validate `gcloud run revisions describe --format=json`
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../backend/migrations/', import.meta.url));
export const SCHEMA_LABEL = 'prepalgo-schema';
// Revisions built before schema labels (e.g. prep-algo-backend-00049-das) refuse
// to start when the database has any migration they do not know.
export const LEGACY_SCHEMA = '002';
const CONTRACT_MARKER = /^\s*--\s*prepalgo:contract\b/m;

export function loadMigrations(dir = MIGRATIONS_DIR) {
    return readdirSync(dir).filter((f) => /^\d{3,}_[a-z0-9_]+\.sql$/.test(f)).sort().map((file) => ({
        file,
        version: file.split('_')[0],
        sql: readFileSync(path.join(dir, file), 'utf8'),
    }));
}

const stripComments = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

// Statements that make the schema incompatible with code from the previous release.
const BREAKING = [
    [/\bDROP\s+(TABLE|COLUMN|TYPE|SCHEMA|VIEW|FUNCTION)\b/i, 'drops an object older code may use'],
    [/\bRENAME\b/i, 'renames an object older code may use'],
    [/\bALTER\s+COLUMN\s+\w+\s+(SET\s+DATA\s+)?TYPE\b/i, 'changes a column type'],
    [/\bALTER\s+COLUMN\s+\w+\s+SET\s+NOT\s+NULL\b/i, 'makes an existing column required'],
    [/\bDROP\s+CONSTRAINT\b[^;]*\bCASCADE\b/i, 'cascades a constraint drop'],
];

export function breakingChanges(sql) {
    const body = stripComments(sql);
    const found = BREAKING.filter(([re]) => re.test(body)).map(([, why]) => why);
    // New NOT NULL columns without a default make older INSERTs fail.
    for (const [clause] of body.matchAll(/\bADD\s+COLUMN\b[^,;]*/gi)) {
        if (/\bNOT\s+NULL\b/i.test(clause) && !/\bDEFAULT\b/i.test(clause)
            && !/\bGENERATED\b/i.test(clause)) {
            found.push('adds a required column without a default');
        }
    }
    return found;
}

/** Errors for breaking migrations that do not declare themselves as contract steps. */
export function lintMigrations(migrations) {
    const errors = [];
    // The initial schema creates everything; there is no older PostgreSQL code to break.
    for (const m of migrations.slice(1)) {
        const why = breakingChanges(m.sql);
        if (why.length && !CONTRACT_MARKER.test(m.sql)) {
            errors.push(`${m.file}: ${[...new Set(why)].join('; ')}. Split into expand/contract or mark `
                + '`-- prepalgo:contract` (this retires older rollback targets).');
        }
    }
    return errors;
}

export function schemaPolicy(migrations) {
    const contract = migrations.filter((m) => CONTRACT_MARKER.test(m.sql)).map((m) => m.version);
    return {
        latest: migrations.at(-1)?.version || '000',
        floor: contract.at(-1) || '000',
    };
}

/** Why a Cloud Run revision (describe JSON) may not receive rollback traffic. */
export function rollbackProblems(revision, policy) {
    const problems = [];
    const container = revision?.spec?.containers?.[0];
    const env = new Set((container?.env || []).map((e) => e.name));
    const labels = revision?.metadata?.labels || {};
    if (!container) problems.push('revision has no container spec');
    if (env.has('MONGO_URI') || env.has('MONGO_URI_DEV')) {
        problems.push('MongoDB-backed revision: it cannot read PostgreSQL writes (fix forward instead)');
    }
    if (!env.has('DATABASE_URL')) problems.push('revision has no DATABASE_URL');
    const schema = labels[SCHEMA_LABEL];
    if (schema && Number(schema) > Number(policy.latest)) {
        problems.push(`revision expects schema ${schema}, newer than this checkout (${policy.latest})`);
    }
    if (!schema && Number(policy.latest) > Number(LEGACY_SCHEMA)) {
        problems.push(`unlabeled revision only starts on schema ${LEGACY_SCHEMA}; this checkout is at ${policy.latest}`);
    }
    if (policy.floor !== '000' && (!schema || Number(schema) < Number(policy.floor))) {
        problems.push(`revision predates contract migration ${policy.floor} (schema ${schema || 'unlabeled'})`);
    }
    const ready = (revision?.status?.conditions || []).find((c) => c.type === 'Ready');
    if (ready && ready.status !== 'True') problems.push('revision is not Ready');
    return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const migrations = loadMigrations();
    const lint = lintMigrations(migrations);
    if (lint.length) {
        console.error(lint.join('\n'));
        process.exit(1);
    }
    const policy = schemaPolicy(migrations);
    const [command] = process.argv.slice(2);
    if (command === 'schema') {
        console.log(policy.latest);
    } else if (command === 'check') {
        let input = '';
        for await (const chunk of process.stdin) input += chunk;
        const revision = JSON.parse(input);
        const problems = rollbackProblems(revision, policy);
        if (problems.length) {
            console.error(`Refusing rollback to ${revision.metadata?.name}:\n- ${problems.join('\n- ')}`);
            process.exit(1);
        }
        console.log(`${revision.metadata.name} is PostgreSQL-compatible (schema floor ${policy.floor})`);
    } else {
        console.error('Usage: rollback.mjs schema | check < revision.json');
        process.exit(2);
    }
}
