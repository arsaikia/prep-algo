/**
 * Reads a human-readable message out of an Axios error.
 *
 * The API is not consistent about where the reason lives: the error handler
 * sends `{ success, error }`, validation failures send `{ error, details }`,
 * and a few older routes send `{ message }`. Call sites used to pick one of
 * those fields and got `undefined` for the other two, which is how a failed
 * submission ended up rendering "Error: undefined".
 *
 * Keeping the precedence in one place means a new response shape is a
 * one-line change here rather than a hunt through every catch block.
 */
export default function readApiError(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;

  const fromBody = data?.error || data?.details || data?.message;
  if (typeof fromBody === 'string' && fromBody.trim()) {
    return fromBody;
  }

  if (error?.response?.status) {
    return `Request failed (${error.response.status}). ${fallback}`;
  }

  // No response at all: the request never reached the server.
  if (error?.request) {
    return 'Could not reach the server. Check that the backend is running and try again.';
  }

  return error?.message || fallback;
}
