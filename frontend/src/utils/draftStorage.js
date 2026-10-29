const key = (question, language) => `sandbox-draft:${question || 'scratch'}:${language}`;
const unavailable = () => queueMicrotask(() => globalThis.dispatchEvent?.(new Event('prep:storage-unavailable')));
const resolveStorage = (storage) => typeof storage === 'function' ? storage() : storage;

export function readDraft(question, language, storage = () => globalThis.localStorage, onError = unavailable) {
  try { return resolveStorage(storage).getItem(key(question, language)); }
  catch { onError(); return null; }
}

export function writeDraft(question, language, value, storage = () => globalThis.localStorage, onError = unavailable) {
  try { resolveStorage(storage).setItem(key(question, language), value); return true; }
  catch { onError(); return false; }
}

export function clearDraft(question, language, storage = () => globalThis.localStorage, onError = unavailable) {
  try { resolveStorage(storage).removeItem(key(question, language)); return true; }
  catch { onError(); return false; }
}
