import { mkdir, copyFile, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// An allowlist keeps API credentials, content, local data and unrelated code off the executor.
export const files = [
    'package.json',
    'package-lock.json',
    'executor/server.js',
    'config/logger.js',
    'utils/limitConcurrency.js',
    'utils/executionBudget.js',
    'utils/sandbox/runners.js',
    'utils/sandbox/policy.js',
];

export async function packageExecutor(parent) {
    await mkdir(parent, { recursive: true });
    const output = await mkdtemp(path.join(parent, 'prepalgo-executor-'));
    for (const file of files) {
        const target = path.join(output, file);
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(path.join(root, 'backend', file), target);
    }
    await writeFile(path.join(output, 'executor-package.json'), `${JSON.stringify({
        version: 1, files, builtAt: new Date().toISOString(),
    }, null, 2)}\n`);
    return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (!process.argv[2]) throw new Error('Supply an output parent outside the repository');
    const parent = path.resolve(process.argv[2]);
    if (parent === root || parent.startsWith(`${root}${path.sep}`)) {
        throw new Error('Executor packages must be staged outside the repository');
    }
    console.log(await packageExecutor(parent));
}
