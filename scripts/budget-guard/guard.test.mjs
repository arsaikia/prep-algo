import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import {
    decide, handle, maintenanceFile, MAINTENANCE_MESSAGE, resumePublicSurfaces, stopPublicSurfaces,
} from './guard.mjs';

const NAME = 'PrepAlgo monthly (~10 USD)';
const env = {
    BUDGET_DISPLAY_NAME: NAME, TARGET_PROJECT: 'p', TARGET_REGION: 'r', TARGET_SERVICE: 's', TARGET_SITE: 'site',
};
const event = (n) => ({ data: { message: { data: Buffer.from(JSON.stringify(n)).toString('base64') } } });
const note = (costAmount, extra = {}) => ({
    budgetDisplayName: NAME, costAmount, budgetAmount: 1000, currencyCode: 'INR', ...extra,
});

function fakeApis({
    ingress = 'INGRESS_TRAFFIC_ALL', lastMessage = 'deploy', uploadRequired = true, releases,
} = {}) {
    const calls = [];
    const fetchImpl = async (url, init = {}) => {
        calls.push(`${init.method || 'GET'} ${url}`);
        let body = {};
        if (url.includes('metadata')) body = { access_token: 't' };
        else if (url.includes('run.googleapis.com') && !init.method) body = { ingress };
        else if (url.includes('releases') && !init.method) body = { releases: releases || [{ message: lastMessage }] };
        else if (url.endsWith('/sites/site/versions')) body = { name: 'sites/site/versions/v1' };
        else if (url.endsWith(':populateFiles')) {
            const { files } = JSON.parse(init.body);
            body = { uploadUrl: 'https://upload/v1', uploadRequiredHashes: uploadRequired ? Object.values(files) : [] };
        }
        return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
    };
    return { calls, fetchImpl };
}

test('maintenance page is a self-contained noindex document', () => {
    const { gz, hash } = maintenanceFile();
    const html = gunzipSync(gz).toString('utf8');
    assert.match(html, /temporarily paused/);
    assert.match(html, /name="robots" content="noindex"/);
    assert.doesNotMatch(html, /<script|src=|href=/, 'must not depend on any other asset or the API');
    assert.match(hash, /^[0-9a-f]{64}$/);
});

test('separate shutoff limit lets budget emails warn first', () => {
    assert.equal(decide(note(1000), { budgetName: NAME, shutoffAmount: '2000' }).reason, 'below-shutoff');
    assert.equal(decide(note(1999.99), { budgetName: NAME, shutoffAmount: '2000' }).act, false);
    assert.equal(decide(note(2000), { budgetName: NAME, shutoffAmount: '2000' }).act, true);
    assert.equal(decide(note(5000), { budgetName: NAME, shutoffAmount: 'abc' }).reason, 'invalid-shutoff');
    assert.equal(decide(note(5000), { budgetName: NAME, shutoffAmount: '0' }).reason, 'invalid-shutoff');
});

test('without a shutoff limit, acts when actual spend reaches the budget', () => {
    assert.equal(decide(note(999.99), { budgetName: NAME }).act, false);
    assert.equal(decide(note(1000), { budgetName: NAME }).act, true);
    assert.equal(decide(note(5000, { budgetDisplayName: 'other' }), { budgetName: NAME }).reason, 'other-budget');
    assert.equal(decide(note(Number.NaN), { budgetName: NAME }).reason, 'malformed');
    assert.equal(decide(note(10, { budgetAmount: 0 }), { budgetName: NAME }).reason, 'malformed');
    assert.equal(decide(null, { budgetName: NAME }).reason, 'malformed');
});

test('forecast-only alerts above 100% do not act while actual spend is below budget', async () => {
    const { calls, fetchImpl } = fakeApis();
    const r = await handle(event(note(400, { forecastThresholdExceeded: 1.0 })), env, { fetchImpl, log: () => {} });
    assert.equal(r.act, false);
    assert.equal(calls.length, 0);
});

test('dry run is the default and never mutates', async () => {
    const { calls, fetchImpl } = fakeApis();
    const r = await handle(event(note(1200)), env, { fetchImpl, log: () => {} });
    assert.match(r.results.cloudRun, /^would-set-internal/);
    assert.equal(r.results.hosting, 'would-publish-maintenance');
    assert.ok(calls.every((c) => c.startsWith('GET')));
});

test('armed guard restricts API ingress and publishes the maintenance page, idempotently', async () => {
    const armed = { ...env, DRY_RUN: 'false' };
    const first = fakeApis();
    const r = await handle(event(note(1200)), armed, { fetchImpl: first.fetchImpl, log: () => {} });
    assert.equal(r.results.hosting, 'maintenance sites/site/versions/v1');
    const H = 'https://firebasehosting.googleapis.com/v1beta1';
    const mutations = first.calls.filter((c) => !c.startsWith('GET'));
    assert.deepEqual(mutations.map((c) => c.replace(/[0-9a-f]{64}$/, 'HASH')), [
        'PATCH https://run.googleapis.com/v2/projects/p/locations/r/services/s?updateMask=ingress',
        `POST ${H}/sites/site/versions`,
        `POST ${H}/sites/site/versions/v1:populateFiles`,
        'POST https://upload/v1/HASH',
        `PATCH ${H}/sites/site/versions/v1?update_mask=status`,
        `POST ${H}/sites/site/channels/live/releases?versionName=sites%2Fsite%2Fversions%2Fv1`,
    ]);

    const again = fakeApis({ ingress: 'INGRESS_TRAFFIC_INTERNAL_ONLY', lastMessage: MAINTENANCE_MESSAGE });
    const r2 = await handle(event(note(1300)), armed, { fetchImpl: again.fetchImpl, log: () => {} });
    assert.deepEqual(r2.results, { cloudRun: 'already-internal', hosting: 'already-maintenance' });
    assert.ok(again.calls.every((c) => c.startsWith('GET')));
});

test('skips the upload when Hosting already has the page content', async () => {
    const { calls, fetchImpl } = fakeApis({ uploadRequired: false });
    await handle(event(note(1200)), { ...env, DRY_RUN: 'false' }, { fetchImpl, log: () => {} });
    assert.ok(!calls.some((c) => c.includes('https://upload/')));
    assert.ok(calls.some((c) => c.includes('/channels/live/releases?versionName=')));
});

const target = { project: 'p', region: 'r', service: 's', site: 'site', log: () => {} };

test('operator token skips the metadata server', async () => {
    const { calls, fetchImpl } = fakeApis();
    await stopPublicSurfaces({ ...target, dryRun: true, token: 'operator', fetchImpl });
    assert.ok(!calls.some((c) => c.includes('metadata')));
});

test('resume opens ingress and restores the newest non-maintenance release', async () => {
    const releases = [
        { message: MAINTENANCE_MESSAGE, version: { name: 'sites/site/versions/m2' } },
        { message: MAINTENANCE_MESSAGE, version: { name: 'sites/site/versions/m1' } },
        { type: 'SITE_DISABLE' },
        { message: 'deploy', type: 'DEPLOY', version: { name: 'sites/site/versions/app' } },
    ];
    const dry = fakeApis({ ingress: 'INGRESS_TRAFFIC_INTERNAL_ONLY', releases });
    const d = await resumePublicSurfaces({ ...target, dryRun: true, token: 't', fetchImpl: dry.fetchImpl });
    assert.equal(d.hosting, 'would-restore sites/site/versions/app');
    assert.ok(dry.calls.every((c) => c.startsWith('GET')));

    const live = fakeApis({ ingress: 'INGRESS_TRAFFIC_INTERNAL_ONLY', releases });
    const r = await resumePublicSurfaces({ ...target, dryRun: false, token: 't', fetchImpl: live.fetchImpl });
    assert.deepEqual(r, {
        cloudRun: 'set-public (was INGRESS_TRAFFIC_INTERNAL_ONLY)', hosting: 'restored sites/site/versions/app',
    });
    assert.deepEqual(live.calls.filter((c) => !c.startsWith('GET')), [
        'PATCH https://run.googleapis.com/v2/projects/p/locations/r/services/s?updateMask=ingress',
        'POST https://firebasehosting.googleapis.com/v1beta1/sites/site/channels/live/releases?versionName=sites%2Fsite%2Fversions%2Fapp',
    ]);
});

test('resume is a no-op when not in maintenance and refuses to guess a pruned site', async () => {
    const idle = fakeApis();
    assert.deepEqual(await resumePublicSurfaces({ ...target, token: 't', fetchImpl: idle.fetchImpl }),
        { cloudRun: 'already-public', hosting: 'not-in-maintenance' });
    assert.ok(idle.calls.every((c) => c.startsWith('GET')));

    const pruned = fakeApis({ releases: [{ message: MAINTENANCE_MESSAGE, version: { name: 'm' } }] });
    await assert.rejects(resumePublicSurfaces({ ...target, token: 't', fetchImpl: pruned.fetchImpl }),
        /no pre-maintenance Hosting release/);
});
