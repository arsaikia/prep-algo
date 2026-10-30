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

const IO_TYPE = z.enum([
    'ARRAY',
    'TREE',
    'STRING',
    'NUMBER',
    'BOOLEAN',
    'LINKEDLIST',
    'LINKEDLIST_CYCLE',
    /** An array of linked lists, e.g. merge-k-sorted-lists. */
    'LINKEDLIST_ARRAY',
    'GRAPH',
    'RANDOM_LIST',
    'NODE_INDEX',
    'TREE_NODE',
    'TREE_CONTEXT',
    'OPS',
    /** Interactive APIs: LeetCode's ArrayReader and Robot, built from the input. */
    'ARRAY_READER',
    'ROBOT_ROOM',
    /** JavaScript only: the body of an async function that drives the solution. */
    'SCENARIO',
]);

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
            /** Language submissions are graded in; Python unless stated. */
            language: z.enum(['python', 'javascript']).optional(),
            inputs: z.array(IO_TYPE).default([]),
            output: IO_TYPE.optional(),
            /** Mutates its first argument; a None return grades that argument. */
            inPlace: z.boolean().optional(),
            /**
             * How a returned value is matched against the recorded answer when
             * the problem accepts more than one: `unordered` ignores the order
             * of the top-level list, `unordered-nested` the order at every level.
             */
            compare: z.enum(['exact', 'unordered', 'unordered-nested']).optional(),
            /**
             * `[encode, decode]` method names on a `Codec` class. The answer is
             * `Codec().decode(Codec().encode(*inputs))`, and encode must return a string.
             */
            codec: z.tuple([z.string().min(1), z.string().min(1)]).optional(),
            /** Named server-side validator for answers no single value captures. */
            checker: z.string().min(1).optional(),
        })
        .optional(),
    exampleTestCases: z.array(testCase.refine(
        (c) => !c.inputs.some((i) => i.startsWith('gen:')) && !c.expectedOutput.startsWith('sha256:'),
        'generated (gen:) inputs and digest (sha256:) answers are only allowed in hidden test cases',
    )).default([]),
    /**
     * Never shipped to the browser. The build strips these into a
     * server-only artifact; leaking them would hand users the answer key.
     */
    testCases: z.array(testCase.extend({ isHidden: z.boolean().default(true) }).refine(
        (c) => c.isHidden || (!c.inputs.some((i) => i.startsWith('gen:')) && !c.expectedOutput.startsWith('sha256:')),
        'generated (gen:) inputs and digest (sha256:) answers are only allowed in hidden test cases',
    )).default([]),
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
    /**
     * Slug of the topic this quiz checks understanding of.
     *
     * When set, the quiz is rendered inline at the end of that topic instead
     * of appearing as a standalone item in a list. Verified by the build, so
     * a quiz can never point at a topic that was renamed or removed.
     */
    topic: z.string().regex(SLUG).optional(),
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
 * A chapter of the System Design curriculum.
 *
 * Exists as its own type rather than being inferred from the topics that
 * point at it, because the curriculum outline has to be expressible before
 * the topics are written. A module with no topics yet renders as a visible
 * "coming soon" chapter; derived-from-topics grouping can only ever show
 * chapters that are already finished, which hides the shape of the syllabus
 * from the reader and from whoever is authoring it next.
 */
export const moduleSchema = z.object({
    ...envelope,
    type: z.literal('module'),
    domain: z.literal('system_design'),
    group: z.string().min(1).default('Curriculum'),
    summary: z.string().default(''),
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
    /**
     * Slug of the owning module. The build checks it resolves, so a topic
     * can never end up orphaned in a chapter that does not exist.
     */
    module: z.string().regex(SLUG),
    /**
     * `concept` explains an idea; `case_study` walks a full "design X"
     * interview question; `reference` is a condensed lookup page (the SD
     * handbook) that sits outside the lesson sequence. They read differently
     * and are listed separately, so the reader needs to tell them apart
     * without pattern-matching slugs.
     */
    kind: z.enum(['concept', 'case_study', 'reference']).default('case_study'),
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
    moduleSchema,
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
    if (item.type === 'module' || item.type === 'topic') return false;
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
    if (item.type === 'module') {
        return { ...base, summary: item.summary };
    }
    if (item.type === 'topic') {
        return {
            ...base,
            summary: item.summary,
            module: item.module,
            kind: item.kind,
            prerequisites: item.prerequisites,
        };
    }
    return {
        ...base,
        difficulty: item.difficulty,
        ...(item.topic ? { topic: item.topic } : {}),
    };
}
