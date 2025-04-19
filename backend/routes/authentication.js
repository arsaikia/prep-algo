import express from 'express';
import { googleAuth } from '../controller/authentication.js';

const router = express.Router();

router.post('/google', googleAuth);

// Export the router
export default router;
