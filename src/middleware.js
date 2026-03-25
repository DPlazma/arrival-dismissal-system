const rateLimit = require('express-rate-limit');

const pinRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many PIN attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

function requireAuth(req, res, next) {
    if (req.session && req.session.adminAuthenticated) {
        return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
}

module.exports = { pinRateLimiter, requireAuth };
