import { OAuth2Client } from 'google-auth-library';
import User, {
    generateAuthToken,
    serializeAuthUser,
    serializePublicUser,
    UserConflictError,
    UserValidationError,
} from '../models/User.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import logger from '../config/logger.js';
import { externalApiCircuitBreaker, isDatabaseUnavailableError } from '../config/circuitBreakers.js';

const NETWORK_ERROR_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNABORTED']);

// Distinguishes "Google could not be reached" from "this token is bad".
export function isIdentityProviderUnavailable(err) {
    if (!err) return false;
    if (err.name === 'CircuitBreakerOpenError') return true;
    if (NETWORK_ERROR_CODES.has(err.code)) return true;
    if (err.constructor?.name === 'GaxiosError' || err.name === 'GaxiosError') {
        const status = err.response?.status;
        return !status || status >= 500 || status === 429;
    }
    return false;
}

let oauthClient;
function getOAuthClient() {
    oauthClient ??= new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    return oauthClient;
}

// Invalid tokens are rejected without counting as provider failures, so a
// burst of bad sign-ins cannot open the breaker for everyone.
async function verifyGoogleIdToken(idToken) {
    const outcome = await externalApiCircuitBreaker.execute(async () => {
        try {
            const ticket = await getOAuthClient().verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
            return { payload: ticket.getPayload() };
        } catch (error) {
            if (isIdentityProviderUnavailable(error)) throw error;
            return { error };
        }
    });
    if (outcome.error) throw outcome.error;
    return outcome.payload;
}

function databaseError(err) {
    return isDatabaseUnavailableError(err)
        ? new ErrorResponse('Service temporarily unavailable', 503)
        : new ErrorResponse('Internal Server Error', 500);
}

export function createAuthController({ users = User, verifyIdToken = verifyGoogleIdToken, signToken = generateAuthToken } = {}) {
    /*
     * @desc     Google Sign In/Sign Up
     * @route    POST /api/v1/authentication/google
     * @access   Public
     */
    const googleAuth = asyncHandler(async (req, res, next) => {
        const log = req.log || logger;
        const { token } = req.body || {};

        if (!token || typeof token !== 'string') {
            return next(new ErrorResponse('Please provide a Google token', 400));
        }
        if (verifyIdToken === verifyGoogleIdToken && !process.env.GOOGLE_CLIENT_ID) {
            log.error('GOOGLE_CLIENT_ID is not configured');
            return next(new ErrorResponse('Authentication is misconfigured', 500));
        }

        let payload;
        try {
            payload = await verifyIdToken(token);
        } catch (err) {
            if (isIdentityProviderUnavailable(err)) {
                log.error({ err }, 'Google identity provider unavailable');
                return next(new ErrorResponse('Sign-in is temporarily unavailable', 503));
            }
            log.warn({ err: { message: err.message } }, 'Google token rejected');
            return next(new ErrorResponse('Google authentication failed', 401));
        }

        if (!payload?.sub || !payload.email || payload.email_verified === false) {
            return next(new ErrorResponse('Google authentication failed', 401));
        }

        let user;
        try {
            ({ user } = await users.upsertGoogleUser({
                googleId: payload.sub,
                email: payload.email,
                firstName: payload.given_name || payload.name,
                lastName: payload.family_name,
                picture: payload.picture,
            }));
        } catch (err) {
            if (err instanceof UserConflictError) return next(new ErrorResponse(err.message, 409));
            if (err instanceof UserValidationError) return next(new ErrorResponse('Google authentication failed', 401));
            log.error({ err }, 'failed to persist Google user');
            return next(databaseError(err));
        }

        let jwtToken;
        try {
            jwtToken = signToken(user);
        } catch (err) {
            log.error({ err }, 'failed to sign auth token');
            return next(new ErrorResponse('Authentication is misconfigured', 500));
        }

        res.status(200).json({ success: true, data: serializeAuthUser(user, jwtToken) });
    });

    /*
     * @desc     Get user info by ID
     * @route    GET /api/v1/authentication/user/:id
     * @access   Public
     */
    const getUserById = asyncHandler(async (req, res, next) => {
        const { id } = req.params;

        if (!id) {
            return next(new ErrorResponse('Please provide a user ID', 400));
        }

        let user;
        try {
            user = await users.findById(id);
        } catch (err) {
            (req.log || logger).error({ err }, 'user lookup failed');
            return next(databaseError(err));
        }

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        res.status(200).json({ success: true, user: serializePublicUser(user) });
    });

    return { googleAuth, getUserById };
}

export const { googleAuth, getUserById } = createAuthController();
