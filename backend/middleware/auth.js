import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from './async.js';

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new ErrorResponse('Not authorized — no token provided', 401));
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id firstName lastName email role');

    if (!user) {
      return next(new ErrorResponse('Not authorized — user not found', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ErrorResponse('Token expired — please sign in again', 401));
    }
    return next(new ErrorResponse('Not authorized — invalid token', 401));
  }
});

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
