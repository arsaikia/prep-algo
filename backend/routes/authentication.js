import express from 'express';
import { googleAuth, getUserById } from '../controller/authentication.js';
import cacheMiddleware from '../middleware/cache.js';
import { authLimiter } from '../middleware/rateLimiter/index.js';

const router = express.Router();

// Only sign-in is brute-forceable. The profile read runs on every authed page
// load and must not spend the sign-in budget.
router.post('/google', authLimiter, googleAuth);
router.get('/user/:id', cacheMiddleware, getUserById);

// Export the router
export default router;
