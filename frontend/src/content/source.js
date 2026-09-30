/**
 * Selects where list content comes from.
 *
 * `cdn` is the target state: static content is fetched from the CDN and the
 * API is only asked for per-user progress. `api` restores the previous
 * behaviour where the backend joined content and progress together.
 *
 * This exists so the migration is reversible without a code change or a
 * redeploy of the backend — flip the env var and rebuild the client.
 * It should be deleted once the CDN path has been stable in production.
 */
export const CONTENT_SOURCE = import.meta.env.VITE_CONTENT_SOURCE || 'cdn';

export const isCdnContentEnabled = () => CONTENT_SOURCE === 'cdn';
