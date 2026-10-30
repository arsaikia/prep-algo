export const SITE_NAME = 'PrepAlgo';

const ROUTE_TITLES = {
  '/': 'Home',
  '/all': 'All Questions',
  '/questions': 'All Questions',
  '/algorithms': 'Algorithms',
  '/frontend': 'Frontend',
  '/login': 'Sign in',
  '/codesandbox': 'Code Sandbox',
  '/system-design': 'System Design',
  '/404': 'Page not found',
};

/** `"Two Sum"` → `"Two Sum · PrepAlgo"`; empty parts are dropped. */
export function formatTitle(...parts) {
  return [...parts, SITE_NAME]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(' · ');
}

/** The System Design lesson slug in a pathname, or null. */
export function systemDesignSlug(pathname) {
  const match = /^\/system-design\/([^/]+)\/?$/.exec(pathname || '');
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Title for a route before any page-specific data has loaded. `lessonTitle`
 * refines `/system-design/:slug` once the curriculum index is available.
 */
export function routeTitle(pathname, { lessonTitle } = {}) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  if (systemDesignSlug(path)) return formatTitle(lessonTitle, 'System Design');
  if (path === '/') return SITE_NAME;
  return formatTitle(ROUTE_TITLES[path] || ROUTE_TITLES['/404']);
}
