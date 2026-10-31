import { useEffect, useState } from 'react';

import { loadIndex } from './loader';

/**
 * Assembles the System Design curriculum from the content index.
 *
 * Modules, topics and quizzes are three flat lists in the index — the tree is
 * implied by `topic.module` and `quiz.topic`. Building it here rather than in
 * the sidebar means the reader and the sidebar cannot disagree about what a
 * module contains, and the index is still fetched once for the whole app.
 *
 * Modules with no topics are deliberately kept. They are the part of the
 * syllabus that has been planned but not written, and hiding them would make
 * the curriculum look finished when it is not.
 */
export function buildCurriculum(items) {
    const modules = items
        .filter((item) => item.type === 'module')
        .sort((a, b) => a.order - b.order)
        .map((module) => ({ ...module, topics: [] }));

    const bySlug = new Map(modules.map((module) => [module.slug, module]));

    for (const topic of items.filter((item) => item.type === 'topic')) {
        bySlug.get(topic.module)?.topics.push(topic);
    }
    for (const module of modules) {
        module.topics.sort((a, b) => a.order - b.order);
    }

    const quizByTopic = new Map();
    for (const quiz of items.filter((item) => item.type === 'quiz' && item.topic)) {
        const checks = quizByTopic.get(quiz.topic) ?? [];
        checks.push(quiz);
        quizByTopic.set(quiz.topic, checks);
    }
    for (const checks of quizByTopic.values()) {
        checks.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
    }

    return { modules, quizByTopic };
}

/**
 * `{ status, modules, quizByTopic, error }`.
 *
 * The index is memoised inside the loader, so every consumer mounting this
 * shares one request.
 */
export default function useCurriculum() {
    const [state, setState] = useState({ status: 'loading', modules: [] });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setState({ status: 'loading', modules: [] });

        loadIndex()
            .then((index) => {
                if (cancelled) return;
                setState({ status: 'ready', ...buildCurriculum(index.items) });
            })
            .catch((err) => {
                if (!cancelled) setState({ status: 'error', modules: [], error: err.message });
            });

        return () => { cancelled = true; };
    }, [attempt]);

    return { ...state, retry: () => setAttempt((value) => value + 1) };
}
