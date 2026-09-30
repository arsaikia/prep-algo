import { z } from 'zod';

/**
 * Schemas for authored content.
 *
 * These are the contract between `content/` (source of truth, in git) and the
 * artifacts served from the CDN. A violation here fails `npm run build:content`,
 * and therefore CI — which is the entire point of moving content out of the
 * database. Previously a malformed question was only discovered in production,
 * because Mongo accepted whatever the sync script pushed at it.
 */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Fields every content type carries, regardless of how it is consumed. */
const envelope = {
    slug: z.string().regex(SLUG, 'slug must be kebab-case'),
    title: z.string().min(1),
    domain: z.enum(['algorithms', 'system_design', 'frontend']),
    tags: z.array(z.string().min(1)).default([]),
    order: z.number().int().nonnegative(),
    /** Collections this item belongs to, e.g. "Blind 75". */
    lists: z.array(z.string().min(1)).default([]),
    /**
     * The MongoDB `_id` this item was exported from.
     *
     * Transitional. User progress is still keyed by ObjectId, so the client
     * needs this to join progress onto content. Step 6 rekeys progress to
     * `slug` and this field goes away. It is not a secret — the old API
     * already returned it as `question._id`.
     */
    legacyId: z.string().optional(),
    /**
     * The original routing identifier, when it is not simply the slug.
     *
     * Absent for the overwhelming majority of items, where slug === link.
     * Present only where slugify() had to change the string, so navigation
     * never has to assume that transform was reversible.
     */
    link: z.string().min(1).optional(),
};

const difficulty = z.enum(['Easy', 'Medium', 'Hard']);

const testCase = z.object({
    inputs: z.array(z.string()).min(1, 'at least one input is required'),
    expectedOutput: z.string(),
    explanation: z.string().default(''),
});

const IO_TYPE = z.enum(['ARRAY', 'TREE', 'STRING', 'NUMBER', 'BOOLEAN', 'LINKEDLIST', 'GRAPH', 'OPS']);

/**
 * Solved in the sandbox. Algorithms and frontend coding questions.
 */
export const problemSchema = z.object({
    ...envelope,
    type: z.literal('problem'),
    domain: z.enum(['algorithms', 'frontend']),
    group: z.string().min(1),
    difficulty,
    description: z.string().default(''),
    templates: z
        .object({
            python: z.string().default(''),
            javascript: z.string().default(''),
        })
        .default({ python: '', javascript: '' }),
    types: z
        .object({
            inputs: z.array(IO_TYPE).default([]),
            output: IO_TYPE.optional(),
        })
        .optional(),
    exampleTestCases: z.array(testCase).default([]),
    /**
     * Never shipped to the browser. The build strips these into a
     * server-only artifact; leaking them would hand users the answer key.
     */
    testCases: z.array(testCase.extend({ isHidden: z.boolean().default(true) })).default([]),
});

/**
 * Answered as multiple choice. Any domain.
 */
export const quizSchema = z.object({
    ...envelope,
    type: z.literal('quiz'),
    group: z.string().min(1),
    difficulty,
    description: z.string().default(''),
    options: z
        .array(
            z.object({
                id: z.string().min(1),
                text: z.string().min(1),
                isCorrect: z.boolean(),
                explanation: z.string().default(''),
            }),
        )
        .min(2, 'a quiz needs at least two options')
        .refine((opts) => opts.some((o) => o.isCorrect), {
            message: 'at least one option must be correct',
        }),
});

/**
 * Read and reflected on, not solved. This is the type System Design was
 * missing: it has no difficulty and no pass/fail, and `prerequisites` is the
 * learning-path graph Phase 4 traverses.
 */
export const topicSchema = z.object({
    ...envelope,
    type: z.literal('topic'),
    domain: z.literal('system_design'),
    group: z.string().min(1),
    summary: z.string().default(''),
    /** Markdown. */
    body: z.string().min(1, 'a topic must have a body'),
    keyTakeaways: z.array(z.string().min(1)).default([]),
    /** Slugs of topics that should be read first. */
    prerequisites: z.array(z.string().regex(SLUG)).default([]),
    /** Slugs of problems that exercise this topic. */
    relatedProblems: z.array(z.string().regex(SLUG)).default([]),
});

export const contentItemSchema = z.discriminatedUnion('type', [
    problemSchema,
    quizSchema,
    topicSchema,
]);

/**
 * Whether the item can actually be opened in the solver.
 *
 * The API used to derive this per request by loading every description and
 * test case just to check they were non-empty. It is a pure function of the
 * content, so it belongs in the build: derived here, shipped in the index,
 * and never recomputed at runtime.
 *
 * A code problem needs both a prompt and something to run against. Quizzes
 * and topics have no such prerequisite.
 */
function isAvailableForSolve(item) {
    if (item.type !== 'problem') return true;
    const hasPrompt = Boolean(item.description && item.description.trim());
    const hasCases = item.testCases.length > 0 || item.exampleTestCases.length > 0;
    return hasPrompt && hasCases;
}

/**
 * The list payload. Deliberately excludes bodies, descriptions and test cases:
 * the whole point is that browsing a list does not download every item.
 */
export function toIndexEntry(item) {
    const base = {
        availableForSolve: isAvailableForSolve(item),
        slug: item.slug,
        type: item.type,
        title: item.title,
        domain: item.domain,
        group: item.group,
        order: item.order,
        tags: item.tags,
        lists: item.lists,
        legacyId: item.legacyId,
        ...(item.link ? { link: item.link } : {}),
    };
    if (item.type === 'topic') {
        return { ...base, summary: item.summary, prerequisites: item.prerequisites };
    }
    return { ...base, difficulty: item.difficulty };
}
