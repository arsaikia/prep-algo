import express from 'express';
import { googleAuth, getUserById } from '../controller/authentication.js';
import cacheMiddleware from '../middleware/cache.js';

const router = express.Router();

router.post('/google', googleAuth);
router.get('/user/:id', cacheMiddleware, getUserById);

// Export the router
export default router;
