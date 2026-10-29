/**
 * Helpers for rendering grader results the way LeetCode does: inputs labelled
 * with the parameter names from the starter code and values shown as literals
 * (`[0,1,0]`, `"abc"`), not as JSON-encoded strings.
 */

const MAX_SHOWN = 2000;

const splitTopLevel = (text) => {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if ('([{'.includes(char)) depth += 1;
    if (')]}'.includes(char)) depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
};

/** Parameter names of the solution method in a Python starter template. */
export function parameterNames(template) {
  const match = /def\s+\w+\s*\(([\s\S]*?)\)\s*(?:->[^:]*)?:/.exec(template ?? '');
  if (!match) return [];
  return splitTopLevel(match[1])
    .map((part) => part.split(/[:=]/)[0].trim().replace(/^\*+/, ''))
    .filter((name) => name && name !== 'self');
}

const truncate = (text) => (text.length > MAX_SHOWN ? `${text.slice(0, MAX_SHOWN)}… (${text.length} characters)` : text);

/** Authored values are JSON text; show them compactly. */
export function formatLiteral(value) {
  if (value === undefined) return '';
  if (typeof value === 'string') {
    if (value.startsWith('sha256:')) return '(large answer)';
    if (value.startsWith('gen:')) return '(large generated input)';
    try {
      return truncate(JSON.stringify(JSON.parse(value)));
    } catch {
      return truncate(value);
    }
  }
  return truncate(JSON.stringify(value));
}

/** Values the program returned are already decoded; strings stay quoted. */
export function formatValue(value) {
  if (value === undefined || value === null) return 'null';
  return truncate(JSON.stringify(value));
}

/** Pairs each input with a label, falling back to positions. */
export function labelInputs(inputs, names = []) {
  const list = Array.isArray(inputs) ? inputs : [inputs];
  return list.map((value, i) => ({
    name: list.length === names.length ? names[i] : `input ${i + 1}`,
    value: formatLiteral(value),
  }));
}

export const STATUS_LABELS = {
  passed: 'Accepted',
  wrong: 'Wrong Answer',
  error: 'Runtime Error',
  tle: 'Time Limit Exceeded',
  mle: 'Memory Limit Exceeded',
  skipped: 'Not Run',
};

export function statusLabel(result) {
  return STATUS_LABELS[result.status] ?? (result.passed ? 'Accepted' : 'Wrong Answer');
}
