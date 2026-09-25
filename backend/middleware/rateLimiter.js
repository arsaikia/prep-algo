import rateLimit from 'express-rate-limit';

const createLimiter = (windowMs, max, message) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: message },
    });

export const generalLimiter = createLimiter(
    60 * 1000,
    100,
    'Too many requests, please try again later'
);

export const authLimiter = createLimiter(
    15 * 60 * 1000,
    20,
    'Too many authentication attempts, please try again later'
);

export const codeExecutionLimiter = createLimiter(
    60 * 1000,
    10,
    'Too many code execution requests, please slow down'
);

export const recommendationLimiter = createLimiter(
    60 * 1000,
    15,
    'Too many recommendation requests, please slow down'
);
