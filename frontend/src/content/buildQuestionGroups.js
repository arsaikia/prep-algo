import groupBy from '../utils/groupBy';

/**
 * Adapts a CDN index entry to the shape the question list components expect.
 *
 * The list UI predates the content pipeline and reads `name`, `link` and
 * `_id`. Rather than touch every component, the seam is here — one place
 * that translates, and one place to delete when the UI moves to slugs in
 * Step 6.
 */
function toListQuestion(entry, progress) {
    const record = progress?.get(entry.legacyId);

    return {
        _id: entry.legacyId,
        slug: entry.slug,
        // `link` is only stored when it differs from the slug (most items
        // carry a trailing slash the backend lookup depends on).
        link: entry.link || entry.slug,
        name: entry.title,
        difficulty: entry.difficulty,
        // Derived at build time from the presence of a prompt and test cases,
        // rather than recomputed per request as the API used to.
        availableForSolve: entry.availableForSolve === true,
        group: entry.group,
        domain: entry.domain,
        type: entry.type,
        order: entry.order,
        tags: entry.tags,
        list: entry.lists,
        contentHash: entry.h,
        solved: Boolean(record),
        solveCount: record?.solveCount ?? 0,
        lastSolved: record?.lastSolvedAt ?? null,
        firstSolved: record?.firstSolvedAt ?? null,
    };
}

/**
 * Builds the `{ groups, questions }` payload the questions reducer stores.
 *
 * `progressRows` is optional: guests have none, and the same grouping logic
 * should not fork just because solve status is absent.
 */
export default function buildQuestionGroups(indexItems, progressRows = null) {
    const progress = progressRows
        ? new Map(progressRows.map((row) => [row.questionId, row]))
        : null;

    const questions = indexItems.map((entry) => toListQuestion(entry, progress));
    const grouped = groupBy(questions, (question) => question.group);

    return {
        groups: Array.from(grouped.keys()),
        questions: Object.fromEntries(grouped),
    };
}

export { toListQuestion };
