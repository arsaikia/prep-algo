// @solution recursive-weakmap accept
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Map) {
    const copy = new Map();
    seen.set(value, copy);
    value.forEach((v, k) => copy.set(deepClone(k, seen), deepClone(v, seen)));
    return copy;
  }
  if (value instanceof Set) {
    const copy = new Set();
    seen.set(value, copy);
    value.forEach((v) => copy.add(deepClone(v, seen)));
    return copy;
  }
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const key of Object.keys(value)) copy[key] = deepClone(value[key], seen);
  return copy;
}

// @solution iterative-stack accept
function deepClone(root) {
  const copies = new Map();
  const shell = (value) => {
    if (value === null || typeof value !== 'object') return value;
    if (copies.has(value)) return copies.get(value);
    let copy;
    if (value.constructor === Date) copy = new Date(+value);
    else if (value instanceof Map) copy = new Map();
    else if (value instanceof Set) copy = new Set();
    else copy = Array.isArray(value) ? new Array(value.length) : {};
    copies.set(value, copy);
    work.push(value);
    return copy;
  };
  const work = [];
  const result = shell(root);
  while (work.length) {
    const source = work.pop();
    const target = copies.get(source);
    if (source instanceof Map) for (const [k, v] of source) target.set(shell(k), shell(v));
    else if (source instanceof Set) for (const v of source) target.add(shell(v));
    else if (!(source instanceof Date)) for (const key of Object.keys(source)) target[key] = shell(source[key]);
  }
  return result;
}

// @solution json-roundtrip reject
function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

// @solution shallow-spread reject
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  return Array.isArray(value) ? [...value] : { ...value };
}

// @solution no-cycle-tracking reject
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [deepClone(k), deepClone(v)]));
  if (value instanceof Set) return new Set([...value].map(deepClone));
  const copy = Array.isArray(value) ? [] : {};
  for (const key of Object.keys(value)) copy[key] = deepClone(value[key]);
  return copy;
}

// @solution ignores-map-set reject
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Date) return new Date(value.getTime());
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const key of Object.keys(value)) copy[key] = deepClone(value[key], seen);
  return copy;
}
