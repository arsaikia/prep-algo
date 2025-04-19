import User from '../models/User.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import axios from 'axios';

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
        // Get user info from Google using the access token
        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = response.data;

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
            token: jwtToken,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                picture: user.picture
            }
        });
    } catch (error) {
        console.error('Google authentication error:', error);
        return next(new ErrorResponse('Google authentication failed', 401));
    }
});
