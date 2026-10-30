/**
 * Local lesson-completion progress. Browser-only and best-effort: storage can
 * be missing, full, blocked (private mode) or hold junk from an older build,
 * and none of that may break the reader.
 */
export const COMPLETED_KEY = 'prepalgo.sd.completed.v1';

export function safeLocalStorage() {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
        return null;
    }
}

export function loadCompleted(storage) {
    try {
        const raw = storage?.getItem(COMPLETED_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return [...new Set(parsed.filter((slug) => typeof slug === 'string' && slug))];
    } catch {
        return [];
    }
}

export function saveCompleted(storage, slugs) {
    try {
        if (!storage) return false;
        storage.setItem(COMPLETED_KEY, JSON.stringify(slugs));
        return true;
    } catch {
        return false;
    }
}

export function toggleCompleted(slugs, slug) {
    return slugs.includes(slug) ? slugs.filter((s) => s !== slug) : [...slugs, slug];
}

/**
 * A tiny external store for useSyncExternalStore. The in-memory copy is the
 * source of truth for the session, so toggling still works when persisting
 * fails.
 */
export function createCompletionStore(getStorage = safeLocalStorage) {
    let slugs = loadCompleted(getStorage());
    let snapshot = new Set(slugs);
    const listeners = new Set();
    const emit = () => listeners.forEach((listener) => listener());
    const replace = (next) => {
        slugs = next;
        snapshot = new Set(slugs);
        emit();
    };

    return {
        getSnapshot: () => snapshot,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        toggle(slug) {
            const next = toggleCompleted(slugs, slug);
            saveCompleted(getStorage(), next);
            replace(next);
        },
        /** Re-read storage, e.g. after a `storage` event from another tab. */
        reload() {
            replace(loadCompleted(getStorage()));
        },
    };
}
