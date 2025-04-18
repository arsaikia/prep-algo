import express from 'express';
const router = express.Router();

import {
    signupUser,
    signInUser,
} from '../controller/authentication.js';

router.route('/signup').post(signupUser);
router.route('/signin').post(signInUser);

// Export the router
export { router as authentication };
