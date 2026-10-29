#!/usr/bin/env node
// Manual maintenance switch using the operator's gcloud credentials. It uses
// the same mechanism as the budget guard: API ingress internal-only plus the
// one-file "temporarily paused" Hosting page. Data is never touched.
//
//   node scripts/budget-guard/maintenance.mjs status
//   node scripts/budget-guard/maintenance.mjs on   [--dry-run]
//   node scripts/budget-guard/maintenance.mjs off  [--dry-run]
import { execFileSync } from 'node:child_process';
import { MAINTENANCE_MESSAGE, resumePublicSurfaces, stopPublicSurfaces } from './guard.mjs';

const target = {
    project: process.env.TARGET_PROJECT || 'prepalgo',
    region: process.env.TARGET_REGION || 'us-central1',
    service: process.env.TARGET_SERVICE || 'prep-algo-backend',
    site: process.env.TARGET_SITE || 'prepalgo',
};
const [command, flag] = process.argv.slice(2);
const dryRun = flag === '--dry-run';
if (!['status', 'on', 'off'].includes(command) || (flag && !dryRun)) {
    console.error('Usage: maintenance.mjs status | on [--dry-run] | off [--dry-run]');
    process.exit(2);
}

const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const log = (line) => console.log(line);
// User credentials need an explicit quota project for the Firebase Hosting API.
const fetchImpl = (url, init = {}) => fetch(url, {
    ...init, headers: { ...init.headers, 'x-goog-user-project': target.project },
});

if (command === 'status') {
    const get = async (url) => {
        const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`${url} -> ${res.status}`);
        return res.json();
    };
    const svc = await get(`https://run.googleapis.com/v2/projects/${target.project}/locations/${
        target.region}/services/${target.service}`);
    const { releases = [] } = await get(`https://firebasehosting.googleapis.com/v1beta1/sites/${
        target.site}/channels/live/releases?pageSize=1`);
    const maintenance = releases[0]?.message === MAINTENANCE_MESSAGE;
    console.log(JSON.stringify({
        ingress: svc.ingress,
        hosting: maintenance ? 'maintenance page' : `release ${releases[0]?.version?.name || 'unknown'}`,
        inMaintenance: svc.ingress === 'INGRESS_TRAFFIC_INTERNAL_ONLY' || maintenance,
    }, null, 2));
} else if (command === 'on') {
    await stopPublicSurfaces({ ...target, dryRun, token, fetchImpl, log });
} else {
    await resumePublicSurfaces({ ...target, dryRun, token, fetchImpl, log });
}
