import ErrorResponse from '../utils/errorResponse.js';

/**
 * Ensures the authenticated user owns the resource being addressed.
 *
 * `protect` only establishes *who* the caller is. Routes scoped by a userId
 * additionally need to confirm the caller is that user, otherwise any valid
 * token can read or mutate another account's data.
 *
 * @param {'params'|'body'} source where the target userId is carried.
 */
export const requireSelf = (source = 'params') => (req, res, next) => {
  if (!req.user) {
    return next(new ErrorResponse('Not authorized', 401));
  }

  const targetUserId = source === 'body' ? req.body?.userId : req.params?.userId;

  if (!targetUserId) {
    return next(new ErrorResponse('userId is required', 400));
  }

  if (String(targetUserId) !== String(req.user._id)) {
    return next(new ErrorResponse('Not authorized to access another user\'s data', 403));
  }

  return next();
};

export default requireSelf;
