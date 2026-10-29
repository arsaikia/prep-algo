export function localReturnTo(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')
      || /[\\\s]/.test(value) || [...value].some((char) => char.charCodeAt(0) < 32)) return fallback;
  try {
    const url = new URL(value, 'https://prep.local');
    const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, '').toLowerCase();
    return url.origin === 'https://prep.local' && pathname !== '/login'
      ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export function contentUrl(item) {
  const slug = String(item.slug || item.link || item.name?.toLowerCase().replace(/\s+/g, '-') || '')
    .trim().replace(/\/+$/, '');
  return item.type === 'topic' || item.answerFormat === 'design_doc'
    ? `/system-design/${encodeURIComponent(slug)}`
    : `/codesandbox?question=${encodeURIComponent(slug)}`;
}

export function requestSignIn(onSuccess) {
  window.dispatchEvent(new CustomEvent('prep:sign-in', {
    detail: { onSuccess: typeof onSuccess === 'function' ? onSuccess : null },
  }));
}
