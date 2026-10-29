// Budget kill-switch: when actual monthly spend reaches the shutoff limit, stop
// the pay-per-use API (Cloud Run ingress -> internal) and replace the website
// with a tiny static "paused" page so visitors see a message, not a dead site.
// Fixed-cost resources (executor VM) and databases are deliberately untouched.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const INTERNAL_ONLY = 'INGRESS_TRAFFIC_INTERNAL_ONLY';
export const MAINTENANCE_MESSAGE = 'Budget guard: maintenance page';
const HOSTING = 'https://firebasehosting.googleapis.com/v1beta1';

export function maintenanceFile(html = readFileSync(new URL('./maintenance.html', import.meta.url))) {
    const gz = gzipSync(html);
    return { gz, hash: createHash('sha256').update(gz).digest('hex') };
}

// shutoffAmount (same currency as the budget) may exceed the budget so the
// budget's email thresholds warn before the shutoff; defaults to the budget.
export function decide(notification, { budgetName, shutoffAmount }) {
    if (!notification || typeof notification !== 'object') return { act: false, reason: 'malformed' };
    const { costAmount, budgetAmount, budgetDisplayName } = notification;
    if (budgetName && budgetDisplayName !== budgetName) return { act: false, reason: 'other-budget' };
    if (!Number.isFinite(costAmount) || !Number.isFinite(budgetAmount) || budgetAmount <= 0) {
        return { act: false, reason: 'malformed' };
    }
    const limit = shutoffAmount === undefined || shutoffAmount === '' ? budgetAmount : Number(shutoffAmount);
    if (!Number.isFinite(limit) || limit <= 0) return { act: false, reason: 'invalid-shutoff' };
    // costAmount is always actual spend; forecast-only notifications never reach the limit here.
    if (costAmount < limit) return { act: false, reason: 'below-shutoff' };
    return { act: true, reason: 'shutoff-limit-reached', limit };
}

export function parseCloudEvent(cloudEvent) {
    const data = cloudEvent?.data?.message?.data;
    if (!data) return null;
    try {
        return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    } catch {
        return null;
    }
}

async function metadataToken(fetchImpl) {
    const res = await fetchImpl(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        { headers: { 'Metadata-Flavor': 'Google' } },
    );
    if (!res.ok) throw new Error(`metadata token ${res.status}`);
    return (await res.json()).access_token;
}

async function call(fetchImpl, token, url, init = {}) {
    const res = await fetchImpl(url, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`${init.method || 'GET'} ${url} -> ${res.status}: ${body.slice(0, 300)}`);
    return body ? JSON.parse(body) : {};
}

// Creates, uploads, finalizes and releases a one-file version that rewrites every
// path to the maintenance page. Exported so it can be exercised on a preview channel.
export async function publishMaintenancePage({ site, channel = 'live', token, fetchImpl = fetch }) {
    const { gz, hash } = maintenanceFile();
    const version = await call(fetchImpl, token, `${HOSTING}/sites/${site}/versions`, {
        method: 'POST',
        body: JSON.stringify({
            config: {
                rewrites: [{ glob: '**', path: '/index.html' }],
                headers: [{ glob: '**', headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }],
            },
            labels: { purpose: 'budget-guard' },
        }),
    });
    const populated = await call(fetchImpl, token, `${HOSTING}/${version.name}:populateFiles`, {
        method: 'POST',
        body: JSON.stringify({ files: { '/index.html': hash } }),
    });
    if (populated.uploadRequiredHashes?.includes(hash)) {
        const res = await fetchImpl(`${populated.uploadUrl}/${hash}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
            body: gz,
        });
        if (!res.ok) throw new Error(`upload maintenance page -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    await call(fetchImpl, token, `${HOSTING}/${version.name}?update_mask=status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'FINALIZED' }),
    });
    await call(fetchImpl, token,
        `${HOSTING}/sites/${site}/channels/${channel}/releases?versionName=${encodeURIComponent(version.name)}`, {
            method: 'POST',
            body: JSON.stringify({ message: MAINTENANCE_MESSAGE }),
        });
    return version.name;
}

// `token` lets an operator reuse this with their own credentials (maintenance.mjs);
// the deployed function uses its metadata-server identity.
export async function stopPublicSurfaces({
    project, region, service, site, dryRun, token, fetchImpl = fetch, log = console.log,
}) {
    if (![project, region, service, site].every(Boolean)) throw new Error('budget guard target configuration missing');
    token = token || await metadataToken(fetchImpl);
    const results = {};

    const runUrl = `https://run.googleapis.com/v2/projects/${project}/locations/${region}/services/${service}`;
    const svc = await call(fetchImpl, token, runUrl);
    if (svc.ingress === INTERNAL_ONLY) {
        results.cloudRun = 'already-internal';
    } else if (dryRun) {
        results.cloudRun = `would-set-internal (was ${svc.ingress})`;
    } else {
        await call(fetchImpl, token, `${runUrl}?updateMask=ingress`, {
            method: 'PATCH',
            body: JSON.stringify({ ingress: INTERNAL_ONLY }),
        });
        results.cloudRun = `set-internal (was ${svc.ingress})`;
    }

    const releases = await call(fetchImpl, token, `${HOSTING}/sites/${site}/channels/live/releases?pageSize=1`);
    if (releases.releases?.[0]?.message === MAINTENANCE_MESSAGE) {
        results.hosting = 'already-maintenance';
    } else if (dryRun) {
        results.hosting = 'would-publish-maintenance';
    } else {
        results.hosting = `maintenance ${await publishMaintenancePage({ site, token, fetchImpl })}`;
    }

    log(JSON.stringify({ severity: dryRun ? 'NOTICE' : 'ALERT', message: 'budget guard acted', dryRun, ...results }));
    return results;
}

// Undo stopPublicSurfaces: open API ingress and re-release the newest Hosting
// version that is not the maintenance page. Fails (rather than guessing) if that
// version was pruned by Hosting retention.
export async function resumePublicSurfaces({
    project, region, service, site, dryRun, token, fetchImpl = fetch, log = console.log,
}) {
    if (![project, region, service, site, token].every(Boolean)) throw new Error('resume target configuration missing');
    const results = {};
    const runUrl = `https://run.googleapis.com/v2/projects/${project}/locations/${region}/services/${service}`;
    const svc = await call(fetchImpl, token, runUrl);
    if (svc.ingress === 'INGRESS_TRAFFIC_ALL') {
        results.cloudRun = 'already-public';
    } else if (dryRun) {
        results.cloudRun = `would-set-public (was ${svc.ingress})`;
    } else {
        await call(fetchImpl, token, `${runUrl}?updateMask=ingress`, {
            method: 'PATCH',
            body: JSON.stringify({ ingress: 'INGRESS_TRAFFIC_ALL' }),
        });
        results.cloudRun = `set-public (was ${svc.ingress})`;
    }

    const { releases = [] } = await call(fetchImpl, token,
        `${HOSTING}/sites/${site}/channels/live/releases?pageSize=25`);
    if (releases[0]?.message !== MAINTENANCE_MESSAGE) {
        results.hosting = 'not-in-maintenance';
    } else {
        const previous = releases.find((r) => r.message !== MAINTENANCE_MESSAGE
            && r.type !== 'SITE_DISABLE' && r.version?.name);
        if (!previous) throw new Error('no pre-maintenance Hosting release found; redeploy the frontend');
        if (dryRun) {
            results.hosting = `would-restore ${previous.version.name}`;
        } else {
            await call(fetchImpl, token, `${HOSTING}/sites/${site}/channels/live/releases?versionName=${
                encodeURIComponent(previous.version.name)}`, {
                method: 'POST',
                body: JSON.stringify({ message: 'Maintenance ended: restore site' }),
            });
            results.hosting = `restored ${previous.version.name}`;
        }
    }
    log(JSON.stringify({ severity: 'NOTICE', message: 'public surfaces resumed', dryRun, ...results }));
    return results;
}

export async function handle(cloudEvent, env = process.env, deps = {}) {
    const log = deps.log || console.log;
    const notification = parseCloudEvent(cloudEvent);
    const decision = decide(notification, {
        budgetName: env.BUDGET_DISPLAY_NAME,
        shutoffAmount: env.SHUTOFF_AMOUNT,
    });
    log(JSON.stringify({
        severity: 'INFO',
        message: 'budget notification',
        reason: decision.reason,
        costAmount: notification?.costAmount,
        budgetAmount: notification?.budgetAmount,
        shutoffAmount: decision.limit ?? env.SHUTOFF_AMOUNT,
        currency: notification?.currencyCode,
    }));
    if (!decision.act) return decision;
    const results = await stopPublicSurfaces({
        project: env.TARGET_PROJECT,
        region: env.TARGET_REGION,
        service: env.TARGET_SERVICE,
        site: env.TARGET_SITE,
        dryRun: env.DRY_RUN !== 'false',
        fetchImpl: deps.fetchImpl,
        log,
    });
    return { ...decision, results };
}
