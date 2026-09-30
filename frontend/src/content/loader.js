/**
 * Loads compiled content from the CDN.
 *
 * Content is static, content-addressed and immutable, so this deliberately
 * does not go through `apiClient`: no auth header, no credentials, no
 * backend round-trip. A guest browsing the question list should cost Cloud
 * Run nothing.
 *
 * Request shape:
 *
 *   manifest.json          60s TTL, the only thing ever revalidated
 *     └─ index.<hash>.json immutable, the whole list payload
 *          └─ items/<slug>.<hash>.json  immutable, fetched on demand
 *
 * Each index entry carries its own body hash, so opening an item needs no
 * extra lookup request.
 */

const BASE = '/content';

/**
 * Firebase Hosting rewrites unmatched paths to `index.html`, so a missing
 * artifact arrives as an HTML 200 rather than a 404. Parsing that yields
 * `Unexpected token '<'`, which says nothing useful. Check the content type
 * and fail with the actual problem.
 */
async function fetchJson(url) {
    const res = await fetch(url, { credentials: 'omit' });

    if (!res.ok) {
        throw new Error(`Content request failed: ${url} returned ${res.status}`);
    }

    const type = res.headers.get('content-type') || '';
    if (!type.includes('json')) {
        throw new Error(
            `Content request failed: ${url} returned "${type}" instead of JSON. `
            + 'The artifact is probably missing and the SPA rewrite served index.html.',
        );
    }

    return res.json();
}

let indexPromise = null;

/**
 * The compiled index, fetched at most once per page load.
 *
 * Held as a promise rather than a resolved value so concurrent callers share
 * one in-flight request instead of racing to issue their own.
 */
export function loadIndex() {
    if (!indexPromise) {
        indexPromise = (async () => {
            const manifest = await fetchJson(`${BASE}/manifest.json`);
            return fetchJson(`${BASE}/${manifest.index}`);
        })().catch((err) => {
            // Don't cache a failure — a transient network error should not
            // leave the app permanently unable to load content.
            indexPromise = null;
            throw err;
        });
    }
    return indexPromise;
}

const itemCache = new Map();

/** Full body for one item. `hash` comes from the index entry's `h` field. */
export function loadItem(slug, hash) {
    const key = `${slug}.${hash}`;
    if (!itemCache.has(key)) {
        itemCache.set(
            key,
            fetchJson(`${BASE}/items/${key}.json`).catch((err) => {
                itemCache.delete(key);
                throw err;
            }),
        );
    }
    return itemCache.get(key);
}

/** Test seam. */
export function __resetContentCache() {
    indexPromise = null;
    itemCache.clear();
}
