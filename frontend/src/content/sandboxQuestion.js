/**
 * Resolves a sandbox `?question=` value against the CDN and produces the same
 * question shape `GET /api/v1/questions/:slug` returns.
 *
 * Item bodies are published to the CDN to be fetched on open, so reading them
 * there lets a guest open any question without touching the backend; only Run
 * and Submit need the API. Keeping the shape identical to the API response
 * means the page cannot tell which source answered, which is what makes the
 * API a safe fallback.
 */

const ANSWER_FORMAT = { problem: 'code', quiz: 'mcq', topic: 'design_doc' };

/** Question params arrive as slugs or as legacy links, which end in `/`. */
export function toSlug(value) {
    return String(value ?? '').trim().replace(/\/+$/, '');
}

/** The index entry a question param refers to, or null. Modules are navigation, not questions. */
export function findQuestionEntry(index, value) {
    const slug = toSlug(value);
    if (!slug) return null;

    return (index?.items || []).find((item) => item.slug === slug && item.type !== 'module') ?? null;
}

/**
 * Shapes a CDN item body like the API's question detail.
 *
 * Public test cases and the hidden-case count are not published; nothing in
 * the sandbox reads them, since Run executes the examples server-side.
 */
export function toSandboxQuestion(body) {
    const question = {
        id: body.legacyId ?? null,
        slug: body.slug,
        type: body.type,
        title: body.title,
        description: body.description || body.summary || 'No description available',
        difficulty: body.difficulty ?? null,
        domain: body.domain || 'algorithms',
        answerFormat: ANSWER_FORMAT[body.type] ?? null,
        exampleTestCases: (body.exampleTestCases || []).map((tc) => ({
            inputs: tc.inputs || [],
            expectedOutput: tc.expectedOutput || '',
            explanation: tc.explanation || '',
        })),
        topics: [body.group],
        templates: body.templates || { python: '', javascript: '' },
    };

    if (body.type === 'quiz') {
        question.mcqOptions = (body.options || []).map(({ id, text }) => ({ id, text }));
        if (body.topic) question.topic = body.topic;
    }

    if (body.type === 'topic') {
        question.module = body.module;
        question.body = body.body || '';
    }

    return question;
}
