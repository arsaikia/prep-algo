/**
 * Pure derivations over the System Design curriculum built by
 * `buildCurriculum`. Lessons (`concept`, `case_study`) form the learning
 * path; `reference` topics such as the handbook are looked up, not read in
 * order, so they never take part in sequencing, counts or progress.
 */
export const HANDBOOK_SLUG = 'system-design-handbook';
export const PATTERNS_MODULE = 'sd-patterns';
const LESSON_KINDS = new Set(['concept', 'case_study']);

export const isLesson = (topic) => LESSON_KINDS.has(topic?.kind);
export const isReference = (topic) => topic?.kind === 'reference';

export function kindLabel(topic) {
    if (isReference(topic)) return 'Reference';
    if (topic?.kind === 'case_study') return 'Design practice';
    return 'Concept lesson';
}

export function lessonPath(modules = []) {
    return modules.flatMap((module) => module.topics.filter(isLesson));
}

export function lessonNeighbours(modules, slug) {
    const path = lessonPath(modules);
    const position = path.findIndex((topic) => topic.slug === slug);
    if (position < 0) return { previous: null, next: null, isLesson: false };
    return {
        previous: path[position - 1] ?? null,
        next: path[position + 1] ?? null,
        isLesson: true,
    };
}

export function findTopic(modules = [], slug) {
    for (const module of modules) {
        const topic = module.topics.find((t) => t.slug === slug);
        if (topic) return topic;
    }
    return null;
}

export function curriculumStats(modules = [], quizByTopic = new Map()) {
    const lessons = lessonPath(modules);
    return {
        lessons: lessons.length,
        concepts: lessons.filter((t) => t.kind === 'concept' && t.module !== PATTERNS_MODULE).length,
        patterns: lessons.filter((t) => t.module === PATTERNS_MODULE).length,
        caseStudies: lessons.filter((t) => t.kind === 'case_study' && t.module !== PATTERNS_MODULE).length,
        checks: modules.flatMap((m) => m.topics)
            .reduce((count, topic) => count + (quizByTopic.get(topic.slug)?.length ?? 0), 0),
    };
}

/** `{ done, total }` over lesson topics; `completed` is a Set of slugs. */
export function progressOf(topics, completed) {
    const lessons = topics.filter(isLesson);
    return {
        done: lessons.filter((t) => completed.has(t.slug)).length,
        total: lessons.length,
    };
}
