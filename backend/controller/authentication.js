import User from '../models/User.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';

// Create a new OAuth2Client instance
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/*
 * @desc     Google Sign In/Sign Up
 * @route    POST /api/v1/authentication/google
 * @access   Public
 */
export const googleAuth = asyncHandler(async (req, res, next) => {
    const { token } = req.body;

    if (!token) {
        return next(new ErrorResponse('Please provide a Google token', 400));
    }

    try {
        // Verify the token with Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        // Get user info from the verified token
        const payload = ticket.getPayload();
        const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = payload;

        // Check if user exists
        let user = await User.findOne({ googleId });

        if (!user) {
            // Create new user
            user = await User.create({
                googleId,
                email,
                firstName,
                lastName,
                picture
            });
        } else {
            // Update user's profile picture if it has changed
            if (user.picture !== picture) {
                user.picture = picture;
                await user.save();
            }
        }

        // Generate JWT token
        const jwtToken = user.generateAuthToken();

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                userId: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                picture: user.picture,
                token: jwtToken
            }
        });
    } catch (error) {
        console.error('Google authentication error:', error);
        return next(new ErrorResponse('Google authentication failed', 401));
    }
});

/*
 * @desc     Get user info by ID
 * @route    GET /api/v1/authentication/user/:id
 * @access   Public
 */
export const getUserById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    if (!id) {
        return next(new ErrorResponse('Please provide a user ID', 400));
    }

    const user = await User.findById(id);

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
        success: true,
        user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            picture: user.picture
        }
    });
});
