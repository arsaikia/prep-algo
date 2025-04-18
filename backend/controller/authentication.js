import User from '../models/User.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../middleware/error.js';
import { v4 as uuid } from 'uuid';

/*
 * @desc     Sign Up a user
 * @route    POST /api/v1/authentication/signup
 * @access   Public
 */

const signupUser = asyncHandler(async (req, res, next) => {
    const { firstName, lastName, email, password } = req.body;

    // Input validation
    if (!firstName || !lastName || !email || !password) {
        return next(new ErrorResponse('Please provide all required fields', 400));
    }

    if (password.length < 6) {
        return next(new ErrorResponse('Password must be at least 6 characters', 400));
    }

    // Check if user already exists using index
    const userExists = await User.findOne({ email }).select('_id');
    if (userExists) {
        return next(new ErrorResponse('User already exists. Please sign in', 409));
    }

    // Create new user with validated data
    const user = await User.create({
        firstName,
        lastName,
        email,
        password,
    });

    if (!user) {
        return next(new ErrorResponse('Signup error', 400));
    }

    // Return only necessary data
    res.status(201).json({ 
        success: true, 
        data: { 
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        } 
    });
});

/*
 * @desc     Sign In a user
 * @route    POST /api/v1/signin
 * @access   Public
 */

const signInUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
        return next(new ErrorResponse('Please provide email and password', 400));
    }

    // Use the static method to find user and select password
    const user = await User.findByEmail(email);
    
    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check password
    const isCorrectPassword = await user.validatePassword(password);
    if (!isCorrectPassword) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Return user data
    res.status(200).json({
        success: true,
        data: {
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        }
    });
});

export {
    signupUser,
    signInUser,
};
