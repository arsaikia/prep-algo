import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const artifactPath = /^\/(?:assets\/[a-zA-Z0-9_./-]+|content\/(?:items\/[a-z0-9-]+\.[a-f0-9]{10}|index\.[a-f0-9]{10})\.json)$/;

async function artifacts(buildDir) {
    const files = [];
    async function walk(dir, prefix) {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            const relative = `${prefix}/${entry.name}`;
            if (entry.isDirectory()) await walk(path.join(dir, entry.name), relative);
            else if (artifactPath.test(relative)) {
                files.push({ path: relative, sha256: digest(await readFile(path.join(buildDir, relative))) });
            }
        }
    }
    await walk(path.join(buildDir, 'assets'), '/assets');
    await walk(path.join(buildDir, 'content'), '/content');
    return files.sort((a, b) => a.path.localeCompare(b.path));
}

export async function restoreRelease(origin, buildDir = path.join(root, 'frontend/build')) {
    const base = new URL(origin);
    if (base.protocol !== 'https:' || base.username || base.password) throw new Error('Hosting origin must use HTTPS');
    const response = await fetch(new URL('/release-assets.json', base), { signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        if (process.env.HOSTING_BOOTSTRAP === '1') {
            console.warn('Explicit bootstrap: prior hashed assets must be restored from the previous release archive.');
            return;
        }
        throw new Error('Previous release inventory unavailable. Restore its build archive first; HOSTING_BOOTSTRAP=1 is only for the documented first inventory rollout.');
    }
    const { files } = await response.json();
    if (!Array.isArray(files) || files.length > 5000) throw new Error('Invalid previous release inventory');
    for (const file of files) {
        if (!artifactPath.test(file.path) || file.path.includes('..') || !/^[a-f0-9]{64}$/.test(file.sha256)) {
            throw new Error('Invalid retained artifact identity');
        }
        const target = path.join(buildDir, file.path);
        let current;
        try { current = await readFile(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (current && digest(current) === file.sha256) continue;
        const result = await fetch(new URL(file.path, base), { signal: AbortSignal.timeout(30000) });
        if (!result.ok || Number(result.headers.get('content-length')) > 8 * 1024 * 1024) {
            throw new Error(`Could not restore ${file.path}`);
        }
        const bytes = Buffer.from(await result.arrayBuffer());
        if (bytes.length > 8 * 1024 * 1024 || digest(bytes) !== file.sha256) throw new Error(`Artifact checksum mismatch: ${file.path}`);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, bytes);
    }
}

export async function hostingConfig(buildDir = path.join(root, 'frontend/build')) {
    const config = JSON.parse(await readFile(path.join(root, 'firebase.json'), 'utf8'));
    const immutable = await artifacts(buildDir);
    // Enumerate actual artifacts: a nonexistent hash must never inherit immutable caching.
    for (const resource of immutable) {
        config.hosting.headers.push({
            source: resource.path,
            headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
        });
    }
    return config;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (process.argv[2] === '--restore') {
        await restoreRelease(process.argv[3] || 'https://prepalgo.web.app');
    } else {
        const buildDir = path.join(root, 'frontend/build');
        await writeFile(path.join(buildDir, 'release-assets.json'), `${JSON.stringify({ version: 1, files: await artifacts(buildDir) })}\n`);
        await writeFile(path.join(root, 'firebase.generated.json'), `${JSON.stringify(await hostingConfig(), null, 2)}\n`);
    }
}
