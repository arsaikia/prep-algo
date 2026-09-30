# Authoring problem content

`solve.mjs` is the only supported way to fill in a problem. Never hand-write
`content/problems/**/*.json` — the expected outputs must be produced by
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

Valid names: `ARRAY`, `TREE`, `LINKEDLIST`, `STRING`, `NUMBER`, `BOOLEAN`.

`types` is mandatory because the fallback path guesses how to parse inputs by
scanning the *learner's* code for `TreeNode` / `root` / `left` / `right` /
`ListNode` / `next`. A textbook binary search written with
`left, right = 0, len(nums) - 1` would otherwise have its array parsed into a
tree and fail with `TypeError: object of type 'TreeNode' has no len()`.
Declaring types skips the guess entirely.

`TREE` and `LINKEDLIST` inputs are given as level-order / sequential JSON arrays
and arrive already built into `TreeNode` / `ListNode` objects.

## Harness contract

- The harness calls **the first non-underscore callable on `Solution`**, chosen
  alphabetically. Define exactly one public method. Put helpers inside it as
  closures, or prefix them with `_`.
- `List`, `Dict`, `Set`, `Tuple`, `Optional`, `Union`, `Any` are injected
  automatically. Do not import them.
- `TreeNode`, `ListNode`, `buildTree`, `buildLinkedList`, `treeToList` and
  `linkedListToList` are predefined. Do not redefine them.
- A returned `TreeNode` / `ListNode` is serialized back to a list automatically.
- Comparison is **exact**. For problems with several valid answers, the prose
  must pin a canonical order (e.g. "return the triplets sorted ascending") and
  the reference must produce it.
- Problems solved **in place** on LeetCode must return the mutated structure
  here, and the prose must say so. A method that returns `None` cannot be graded.

## Prose

Write the description yourself. Never copy LeetCode text. Keep the existing HTML
shape: a `<div>` wrapper, `<p>` paragraphs, `<pre>` example blocks, and a
`<ul>` of constraints. Explain the idea in your own words and say what makes the
problem interesting, rather than restating the signature.

## Rules

- Do not commit, and do not run `npm run build:content`.
- Do not edit `content/problems/**` by hand; let the gate write it.
- Keep the python template a stub. The gate rejects a template equal to the
  reference.
