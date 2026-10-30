import { useEffect, useSyncExternalStore } from 'react';

import { COMPLETED_KEY, createCompletionStore } from '../components/systemDesign/progress';

const store = createCompletionStore();

/**
 * `{ completed: Set<slug>, toggle(slug) }`, shared by every consumer (sidebar,
 * overview, reader) and kept in sync with other tabs.
 */
export default function useCompletedLessons() {
    const completed = useSyncExternalStore(store.subscribe, store.getSnapshot);

    useEffect(() => {
        const onStorage = (event) => {
            if (event.key === null || event.key === COMPLETED_KEY) store.reload();
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    return { completed, toggle: store.toggle };
}
