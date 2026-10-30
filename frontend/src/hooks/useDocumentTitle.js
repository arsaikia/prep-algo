import { useEffect } from 'react';

import { formatTitle } from '../utils/documentTitle';

/**
 * Sets `document.title` to `"<title> · PrepAlgo"` while `title` is non-empty.
 * Route-level defaults are applied by `RouteTitle`; pages call this once their
 * own data (a question, a lesson) has loaded to give a more specific title.
 */
export default function useDocumentTitle(title) {
  useEffect(() => {
    if (title) document.title = formatTitle(title);
  }, [title]);
}
