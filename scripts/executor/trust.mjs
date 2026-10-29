// Reads the executor trust bundle (one or two self-signed certificates during
// rotation). CLI: prints whole days until the newest certificate expires.
import { readFile } from 'node:fs/promises';
import { X509Certificate } from 'node:crypto';

export const TRUST_PATH = new URL('../../backend/config/executor-trust.crt', import.meta.url);

export function parseTrustBundle(pem) {
    const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || [];
    return blocks.map(block => new X509Certificate(block));
}

export function daysUntilNewestExpiry(certs, now = Date.now()) {
    const newest = Math.max(...certs.map(cert => Date.parse(cert.validTo)));
    return Math.floor((newest - now) / 86400000);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const certs = parseTrustBundle(await readFile(TRUST_PATH, 'utf8'));
    if (certs.length === 0) throw new Error('No certificate in executor trust bundle');
    console.log(daysUntilNewestExpiry(certs));
}
