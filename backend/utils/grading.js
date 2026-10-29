/**
 * Server-side verdicts.
 *
 * The sandbox only reports the value a submission returned; whether that value
 * is correct is decided here, in the trusted process. Expected outputs are
 * never sent into the sandbox, so submitted code can neither read the answer
 * key nor print a verdict of its own.
 */

import { createHash } from 'node:crypto';

const FLOAT_TOLERANCE = 1e-5;
export const DIGEST_PREFIX = 'sha256:';

/**
 * JSON.parse that keeps integers beyond 2^53 exact (as BigInt), so Python's
 * arbitrary-precision answers are not rounded before they are compared.
 */
export const parseJson = (text) => JSON.parse(text, (key, value, context) => (
    typeof value === 'number' && !Number.isSafeInteger(value) && /^-?\d+$/.test(context?.source ?? '')
        ? BigInt(context.source)
        : value
));

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Matches Python's json.dumps(ensure_ascii=True), which escapes everything
// outside printable ASCII, so both sides produce byte-identical text.
const asciiJson = (value) => (typeof value === 'bigint' ? String(value) : JSON.stringify(value))
    .replace(/[\u007f-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

/**
 * Stable text form used to sort values for order-insensitive comparison and
 * to digest large answers. Mirrors the sandbox's `_canon` exactly.
 */
export const canonical = (value) => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (isObject(value)) {
        return `{${Object.keys(value).sort().map((k) => `${asciiJson(k)}:${canonical(value[k])}`).join(',')}}`;
    }
    return asciiJson(value);
};

const numbersEqual = (a, b) => {
    if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
    return Math.abs(a - b) <= FLOAT_TOLERANCE * Math.max(1, Math.abs(b));
};

/**
 * Structural equality. Booleans never equal numbers and strings never equal
 * the values they spell, so `1` is not an answer to a yes/no question.
 * Non-integer numbers compare within a relative 1e-5 tolerance.
 */
const isInteger = (v) => typeof v === 'bigint' || Number.isInteger(v);

export const valuesEqual = (a, b) => {
    if (typeof a === 'bigint' || typeof b === 'bigint') {
        return isInteger(a) && isInteger(b) && BigInt(a) === BigInt(b);
    }
    if (typeof a === 'number' && typeof b === 'number') return numbersEqual(a, b);
    if (Array.isArray(a) || Array.isArray(b)) {
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length
            && a.every((item, i) => valuesEqual(item, b[i]));
    }
    if (isObject(a) || isObject(b)) {
        if (!isObject(a) || !isObject(b)) return false;
        const keys = Object.keys(a);
        return keys.length === Object.keys(b).length
            && keys.every((k) => Object.hasOwn(b, k) && valuesEqual(a[k], b[k]));
    }
    return a === b;
};

const byCanonical = (x, y) => {
    const a = canonical(x);
    const b = canonical(y);
    return a < b ? -1 : a > b ? 1 : 0;
};
const sortTop = (v) => (Array.isArray(v) ? [...v].sort(byCanonical) : v);
const sortDeep = (v) => (Array.isArray(v) ? sortTop(v.map(sortDeep)) : v);

const normalize = (value, mode) => {
    if (mode === 'unordered') return sortTop(value);
    if (mode === 'unordered-nested') return sortDeep(value);
    return value;
};

/** Digest of an answer in canonical, compare-mode-normalized form. */
export const digestOf = (value, mode = 'exact') =>
    `${DIGEST_PREFIX}${createHash('sha256').update(canonical(normalize(value, mode))).digest('hex')}`;

/**
 * Problems whose valid answers cannot be captured by a single expected value
 * or by ordering. Each receives the parsed inputs, the submitted value and the
 * recorded reference answer, and returns true when the submission is valid.
 */
/** Level-order array (LeetCode format) to `{val, left, right}` nodes. */
const fromLevelOrder = (values) => {
    if (!Array.isArray(values) || values.length === 0 || values[0] === null) return null;
    const root = { val: values[0], left: null, right: null };
    const queue = [root];
    let head = 0;
    for (let i = 1; i < values.length && head < queue.length; head += 1) {
        const node = queue[head];
        for (const side of ['left', 'right']) {
            if (i < values.length && values[i] !== null) {
                node[side] = { val: values[i], left: null, right: null };
                queue.push(node[side]);
            }
            i += 1;
        }
    }
    return root;
};

const inorder = (root) => {
    const out = [];
    const stack = [];
    let node = root;
    while (node || stack.length) {
        while (node) {
            stack.push(node);
            node = node.left;
        }
        node = stack.pop();
        out.push(node.val);
        node = node.right;
    }
    return out;
};

/** Height of the tree, or -1 when some subtree is out of balance. */
const balancedHeight = (root) => {
    const heights = new Map([[null, 0]]);
    const stack = root ? [[root, false]] : [];
    while (stack.length) {
        const [node, visited] = stack.pop();
        if (!visited) {
            stack.push([node, true]);
            for (const child of [node.left, node.right]) if (child) stack.push([child, false]);
            continue;
        }
        const l = heights.get(node.left);
        const r = heights.get(node.right);
        if (l < 0 || r < 0 || Math.abs(l - r) > 1) return -1;
        heights.set(node, Math.max(l, r) + 1);
    }
    return heights.get(root);
};

const sameSequence = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Validators for problems with more than one correct answer. Each receives
 * the submission's answer, the recorded reference answer and the parsed
 * inputs, and decides whether the answer is one of the valid ones.
 */
export const CHECKERS = {
    /** Any order of 0..n-1 that respects every [course, prerequisite] pair; [] when impossible. */
    topologicalOrder(actual, expected, [n, prerequisites]) {
        if (!Array.isArray(actual)) return false;
        if (expected.length === 0) return actual.length === 0;
        if (actual.length !== n) return false;
        const position = new Map(actual.map((course, i) => [course, i]));
        if (position.size !== n || actual.some((c) => !Number.isInteger(c) || c < 0 || c >= n)) return false;
        return prerequisites.every(([course, before]) => position.get(before) < position.get(course));
    },

    /** Any letter order consistent with the sorted word list; "" when none exists. */
    alienOrder(actual, expected, [words]) {
        if (typeof actual !== 'string') return false;
        if (expected === '') return actual === '';
        const letters = new Set(words.join(''));
        const rank = new Map([...actual].map((c, i) => [c, i]));
        if (actual.length !== letters.size || rank.size !== letters.size) return false;
        if ([...letters].some((c) => !rank.has(c))) return false;
        for (let i = 0; i + 1 < words.length; i += 1) {
            const [a, b] = [words[i], words[i + 1]];
            const k = [...a].findIndex((c, j) => c !== b[j]);
            if (k === -1 || k >= b.length) continue;
            if (rank.get(a[k]) > rank.get(b[k])) return false;
        }
        return true;
    },

    /** Any height-balanced BST holding exactly the sorted input values. */
    balancedBstFromSorted(actual, expected, [nums]) {
        const root = fromLevelOrder(actual);
        return sameSequence(inorder(root), nums) && balancedHeight(root) >= 0;
    },

    /**
     * Robot Room Cleaner: the sandbox reports which cells the robot's clean()
     * calls covered (one '0'/'1' string per row); every open cell reachable
     * from the start must be cleaned. Judged here, against the hidden room.
     */
    robotCleaned(actual, expected, [{ room, row, col }]) {
        if (!Array.isArray(actual) || actual.length !== room.length) return false;
        if (actual.some((line, r) => typeof line !== 'string' || line.length !== room[r].length)) return false;
        const seen = new Set();
        const stack = [[row, col]];
        while (stack.length) {
            const [r, c] = stack.pop();
            if (r < 0 || r >= room.length || c < 0 || c >= room[r].length || room[r][c] !== 1) continue;
            if (seen.has(`${r},${c}`)) continue;
            seen.add(`${r},${c}`);
            if (actual[r][c] !== '1') return false;
            stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
        }
        return true;
    },

    /** Any valid BST holding the input tree's values minus the deleted key. */
    bstAfterDelete(actual, expected, [tree, key]) {
        const wanted = inorder(fromLevelOrder(tree)).filter((v) => v !== key);
        return sameSequence(inorder(fromLevelOrder(actual)), wanted);
    },
};

export const COMPARE_MODES = ['exact', 'unordered', 'unordered-nested'];

/**
 * Name of the method the starter template asks learners to implement, i.e.
 * the first `def` inside `class Solution`. The grader calls exactly this
 * method, as LeetCode does, so public helper methods are fine.
 */
export const entryMethod = (template) => {
    const body = /^class\s+Solution\b[^\n]*:\n((?:[ \t]+.*\n?|\s*\n)*)/m.exec(template ?? '')?.[1];
    return body ? /^[ \t]+def\s+([A-Za-z]\w*)\s*\(/m.exec(body)?.[1] ?? null : null;
};

/** Name of the first top-level function a JavaScript starter template declares. */
export const entryFunction = (template) =>
    /^(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/m.exec(template ?? '')?.[1] ?? null;

/** The `types` the grader needs for a problem, with the entry method resolved. */
export const gradingTypes = (item) => {
    const method = item.types?.language === 'javascript'
        ? entryFunction(item.templates?.javascript)
        : entryMethod(item.templates?.python);
    if (!item.types) return method ? { method } : null;
    return method ? { ...item.types, method } : item.types;
};

/**
 * @param {unknown} actual    value the submission returned (already JSON)
 * @param {string} expectedText  authored expected output: JSON text, or
 *   `sha256:<hex>` for answers too large to store (see digestOf)
 * @param {{compare?: string, checker?: string}|null} types
 * @param {string[]} inputs  authored inputs (JSON text, or `gen:` expressions)
 * @param {string|null} actualDigest  set when the sandbox reported a large
 *   answer by digest instead of by value
 */
export const judge = (actual, expectedText, types, inputs = [], actualDigest = null) => {
    if (expectedText.startsWith(DIGEST_PREFIX)) {
        if (types?.checker) throw new Error('checker problems cannot use digest answers');
        return (actualDigest ?? digestOf(actual, types?.compare ?? 'exact')) === expectedText;
    }
    const expected = parseJson(expectedText);
    if (types?.checker) {
        // A digest cannot be validated; checker cases are kept small enough
        // that the sandbox always reports them by value.
        if (actualDigest) return false;
        const check = CHECKERS[types.checker];
        if (!check) throw new Error(`Unknown checker ${types.checker}`);
        return Boolean(check(actual, expected, inputs.map((i) => parseJson(i))));
    }
    if (actualDigest) return actualDigest === digestOf(expected, types?.compare ?? 'exact');
    switch (types?.compare ?? 'exact') {
        case 'exact':
            return valuesEqual(actual, expected);
        case 'unordered':
            return Array.isArray(actual) && valuesEqual(sortTop(actual), sortTop(expected));
        case 'unordered-nested':
            return Array.isArray(actual) && valuesEqual(sortDeep(actual), sortDeep(expected));
        default:
            throw new Error(`Unknown compare mode ${types.compare}`);
    }
};
