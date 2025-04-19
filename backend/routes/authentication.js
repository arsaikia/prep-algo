import express from 'express';
import { googleAuth, getUserById } from '../controller/authentication.js';

const router = express.Router();

router.post('/google', googleAuth);
router.get('/user/:id', getUserById);

// Export the router
export default router;
