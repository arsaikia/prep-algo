# Authoring problem content

`solve.mjs` creates a problem from a draft; `record-cases.mjs` adds or fixes
cases later. Never hand-write expected outputs — they must be produced by
executing a reference solution through the real grading harness, otherwise a
problem that looks finished can be unsolvable.

```bash
node scripts/content/authoring/solve.mjs <draft.json>...      # author a problem
node scripts/content/authoring/solve.mjs --types <draft.json> # backfill types only
node scripts/content/authoring/solve.mjs --check <slug>...    # structural check
```

The gate refuses to write unless the reference reproduces every expected value
it just recorded, *and* those values agree with the outputs your description
claims. Run it until it prints `ok`.

## Draft schema

See `binary-search` for a complete worked example. Required fields:

| Field | Meaning |
| --- | --- |
| `slug` | Must match an existing problem file |
| `description` | Original HTML prose (see below) |
| `reference` | A correct `Solution` class, used only to compute outputs |
| `templates.python` / `templates.javascript` | Learner-facing stubs |
| `exampleInputs` | Visible cases, 2-3 rows |
| `exampleOutputs` | What your prose promises for each example row |
| `testInputs` | Hidden cases, 8-10 rows, including the example rows |
| `types` | `{ inputs: [...], output: "..." }` |
| `explanations.example` | One short sentence per example (optional) |

`exampleOutputs` exists to catch a wrong reference. The gate computes outputs by
running your reference, so a reference that is subtly wrong would otherwise
record its own mistake as the answer. Declaring what the prose promises makes
the two claims cross-checkable.

### Inputs are JSON-literal strings

Every entry in an input row is a **string containing JSON**, one per argument:

```json
["[-1,0,3,5,9,12]", "9"]
["\"anagram\"", "\"nagaram\""]
```

### types

Valid names are listed in `content/schema.js`. The common ones are `ARRAY`,
`TREE`, `LINKEDLIST`, `STRING`, `NUMBER` and `BOOLEAN`. The special ones:

- `OPS`: design problems; the inputs are a call list and an argument list
  replayed against one instance.
- `TREE_NODE` / `TREE_CONTEXT`: a node of the preceding tree, like `p` and `q`
  in lowest-common-ancestor problems.
- `ARRAY_READER`: a JSON array wrapped in LeetCode's `ArrayReader`. `get(i)`
  returns `2**31 - 1` past the end, and more than 100 calls is a runtime error,
  so a linear scan fails.
- `ROBOT_ROOM`: `{"room": [[1,0,...]], "row": r, "col": c}` becomes LeetCode's
  `Robot` (`move`, `turnLeft`, `turnRight`, `clean`; it starts facing up). The
  result is a map of cleaned cells, one `"0"`/`"1"` string per row. Pair it
  with `types.checker: "robotCleaned"`, which checks every reachable cell on
  the server.
- `SCENARIO`: JavaScript problems only (see below).

`types` is mandatory because the fallback path guesses how to parse inputs by
scanning the *learner's* code for `TreeNode` / `root` / `left` / `right` /
`ListNode` / `next`. A textbook binary search written with
`left, right = 0, len(nums) - 1` would otherwise have its array parsed into a
tree and fail with `TypeError: object of type 'TreeNode' has no len()`.
Declaring types skips the guess entirely.

`TREE` and `LINKEDLIST` inputs are given as level-order / sequential JSON arrays
and arrive already built into `TreeNode` / `ListNode` objects.

## Harness contract

- The grader calls the method named by the first `def` inside `class Solution`
  in `templates.python`, exactly as LeetCode does. Keep LeetCode's method name;
  learners may add public helper methods freely.
- `List`, `Dict`, `Set`, `Tuple`, `Optional`, `Union`, `Any` are injected
  automatically. Do not import them.
- `TreeNode`, `ListNode`, `buildTree`, `buildLinkedList`, `treeToList` and
  `linkedListToList` are predefined. Do not redefine them.
- A returned `TreeNode` / `ListNode` is serialized back to a list automatically.
- The sandbox only reports the return value. The verdict is computed by the
  backend (`backend/utils/grading.js`) so a submission cannot forge a pass or
  read the answer key.
- Comparison is exact for integers, strings and booleans (`true` ≠ `1`), and
  within 1e-5 relative for non-integers. Set `types.compare` to `unordered`
  (top-level order ignored) or `unordered-nested` (order ignored at every
  level) for "return in any order" problems. Answers that no single value
  captures need a named `types.checker` registered in `CHECKERS`; the build
  rejects unknown names.
- Set `types.inPlace: true` for LeetCode "modify in place" problems: the
  mutated first argument is graded, whatever the method returns.
- Checker problems cannot use `gen:` inputs; the build rejects them.
- Integers beyond 2^53 are compared exactly.
- Limits: 5 s per case, 15 s per submission; cases after a time-out are
  reported as skipped.
- Python's recursion limit is raised to 100,000, as on LeetCode, so a
  recursive DFS over a full-size grid works.

### JavaScript problems

Frontend problems such as `implement-debounce` are graded in JavaScript. Set
`types: {"language": "javascript", "inputs": ["SCENARIO"]}`, put the starter
code in `templates.javascript`, and leave `templates.python` empty. The grader
calls the first `function name(...)` (or `const name =`) in the template.

Each case has one input: the body of an async function that receives the
entry function and a virtual `clock`, and returns a JSON value that the backend
compares with `expectedOutput`:

```js
const fn = spy();                 // fn.calls is [{args, at}]
const debounced = debounce(fn, 100);
debounced('a');
await clock.tick(50);             // fires due timers on the fake clock
debounced('b');
await clock.tick(100);
return fn.calls;                  // [{"args":["b"],"at":150}]
```

`clock.now()`, `clock.flush()` (run microtasks) and `clock.state(promise)`
(`pending`, `fulfilled` or `rejected`) are also available. Solutions run in a
fresh realm with fake timers and `Date`, and without `require` or `process`.
Solutions live in `scripts/content/solutions/<slug>.js` with
`// @solution <name> <accept|tle|reject>` markers. `gen:` inputs aren't
supported for JavaScript.

## Solutions, verification and large cases

Every problem should have `scripts/content/solutions/<slug>.py`: complete
programs separated by marker lines `# @solution <name> <accept|tle|reject>`
(see `move-zeroes.py`). Keep at least two different `accept` solutions, a
`tle` brute force where the real constraints rule it out, and `reject`
solutions for common mistakes.

```bash
node scripts/content/authoring/verify-solutions.mjs [slug...] [--mode docker] [--shard 0/4] [--missing]
node scripts/content/authoring/record-cases.mjs <slug> --add '[["[1,2]","3"]]' [--example --explanation "..."]
node scripts/content/authoring/record-cases.mjs <slug> --rerecord tests:0,3|examples:1|tests:all
```

`verify-solutions` fails unless `accept` passes everything well inside the
limit, `tle` times out without a wrong answer, and `reject` fails somewhere.
Use `--mode docker` before release; it matches production's 0.5-CPU executor.

`record-cases` computes expected values by running every `accept` solution and
requiring them to agree, then writes them into the problem file. Hidden tests
may use generated inputs, `"gen:<python expression>"`, with a deterministic
`Rng(seed)` (`ints(n, lo, hi)`, `randint`, `choice`, `shuffle`, `word`) so
LeetCode-size inputs don't bloat content. Answers over 50 KB are stored as a
`sha256:` digest of the canonical value. Neither form may appear in visible
cases.

## Prose

Write the description yourself. Never copy LeetCode text. Keep the existing HTML
shape: a `<div>` wrapper, `<p>` paragraphs, `<pre>` example blocks, and a
`<ul>` of constraints. Explain the idea in your own words and say what makes the
problem interesting, rather than restating the signature.

## Rules

- Do not commit, and do not run `npm run build:content`.
- Do not edit expected outputs by hand; let `solve.mjs` or `record-cases.mjs`
  write them.
- Keep the python template a stub. The gate rejects a template equal to the
  reference.
