import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { TRUST_PATH, parseTrustBundle, daysUntilNewestExpiry } from './trust.mjs';
import { files, packageExecutor } from './package.mjs';

test('private executor deployment trusts a valid non-CA certificate matching its HTTPS endpoint', async () => {
    const certs = parseTrustBundle(await readFile(TRUST_PATH, 'utf8'));
    assert.ok(certs.length >= 1 && certs.length <= 2, 'Trust one certificate, or old+new during rotation');
    for (const cert of certs) {
        assert.equal(cert.ca, false);
        assert.equal(cert.checkIP('10.128.0.2'), '10.128.0.2');
        assert.ok(cert.verify(cert.publicKey));
        assert.ok(Date.parse(cert.validFrom) <= Date.now());
        assert.ok(Date.parse(cert.validTo) > Date.now(), 'Remove expired executor trust');
    }
    assert.ok(daysUntilNewestExpiry(certs) > 30, 'Renew executor trust before its last 30 days');
    const build = await readFile(new URL('../../backend/cloudbuild.yaml', import.meta.url), 'utf8');
    assert.ok(build.includes('CODE_EXECUTOR_URL=https://10.128.0.2'));
    assert.ok(build.includes('NODE_EXTRA_CA_CERTS=/app/config/executor-trust.crt'));
    const ignore = await readFile(new URL('../../backend/.gcloudignore', import.meta.url), 'utf8');
    assert.ok(!ignore.split('\n').includes('*.crt'), 'Public executor trust must be uploaded with the candidate');
    assert.ok(build.includes('--vpc-egress private-ranges-only'));
    assert.ok(build.includes('--service-account "prepalgo-api@$PROJECT_ID.iam.gserviceaccount.com"'));
    assert.ok(build.includes('--remove-secrets MONGO_URI,MONGO_URI_DEV'));
});

test('executor deployment bundle contains only allowlisted source and no application environment', async () => {
    const parent = await mkdtemp(path.join(tmpdir(), 'executor-package-test-'));
    try {
        const output = await packageExecutor(parent);
        const actual = [];
        async function walk(directory, prefix = '') {
            for (const entry of await readdir(directory, { withFileTypes: true })) {
                const file = `${prefix}${entry.name}`;
                if (entry.isDirectory()) await walk(path.join(directory, entry.name), `${file}/`);
                else actual.push(file);
            }
        }
        await walk(output);
        assert.deepEqual(actual.sort(), [...files, 'executor-package.json'].sort());
        const manifest = JSON.parse(await readFile(path.join(output, 'package.json'), 'utf8'));
        assert.ok(manifest.dependencies['google-auth-library']);
        assert.ok(!actual.some(file => /(?:^|\/)\.env|content\/|repositories\//.test(file)));
        const entry = await readFile(path.join(output, 'executor/server.js'), 'utf8');
        assert.ok(entry.includes('EXECUTOR_CALLERS'));
    } finally {
        await rm(parent, { recursive: true, force: true });
    }
});

test('rotation trust bundles parse every certificate and use the newest expiry', async () => {
    const pem = await readFile(TRUST_PATH, 'utf8');
    const certs = parseTrustBundle(`${pem}\n${pem}`);
    assert.equal(certs.length, 2);
    const expiry = Date.parse(certs[0].validTo);
    assert.equal(daysUntilNewestExpiry(certs, expiry - 10 * 86400000), 10);
    assert.deepEqual(parseTrustBundle('no certificates'), []);
});
