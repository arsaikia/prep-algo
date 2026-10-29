import jwt from 'jsonwebtoken';
import User, { toRequestUser } from '../models/User.js';
import { isDatabaseUnavailableError } from '../config/circuitBreakers.js';
import ErrorResponse from '../utils/errorResponse.js';
import logger from '../config/logger.js';

function verifyToken(token) {
  try {
    return { decoded: jwt.verify(token, process.env.JWT_SECRET) };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { error: new ErrorResponse('Token expired — please sign in again', 401) };
    }
    return { error: new ErrorResponse('Not authorized — invalid token', 401) };
  }
}

// Token validation and the user lookup fail differently on purpose: a bad
// token is the caller's problem (401); an unreachable database is ours (503)
// and must not log users out by looking like an invalid session.
export function createProtect({ findUserById }) {
  return async function protect(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next(new ErrorResponse('Not authorized — no token provided', 401));
    }
    if (!process.env.JWT_SECRET) {
      (req.log || logger).error('JWT_SECRET is not configured');
      return next(new ErrorResponse('Authentication is misconfigured', 500));
    }

    const { decoded, error } = verifyToken(header.slice('Bearer '.length).trim());
    if (error) return next(error);

    const userId = decoded?.id;
    if (typeof userId !== 'string' || !userId) {
      return next(new ErrorResponse('Not authorized — invalid token', 401));
    }

    let user;
    try {
      user = await findUserById(userId);
    } catch (err) {
      (req.log || logger).error({ err }, 'user lookup failed during authentication');
      return next(isDatabaseUnavailableError(err)
        ? new ErrorResponse('Service temporarily unavailable', 503)
        : new ErrorResponse('Internal Server Error', 500));
    }

    if (!user) {
      return next(new ErrorResponse('Not authorized — user not found', 401));
    }

    req.user = toRequestUser(user);
    return next();
  };
}

export const protect = createProtect({ findUserById: (id) => User.findById(id) });

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized', 401));
    }
    const userRole = req.user.role || 'user';
    if (!roles.includes(userRole)) {
      return next(new ErrorResponse('Not authorized for this action', 403));
    }
    next();
  };
};
