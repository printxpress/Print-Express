import rateLimit from 'express-rate-limit';

// Rate limiter specifically designed for login / OTP routes
// to prevent brute-force attacks and SMS spamming
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login/OTP requests per windowMs
    message: {
        success: false,
        message: 'Too many OTP requests from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
