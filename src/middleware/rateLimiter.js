const rateLimit = require('express-rate-limit');

// Protects our own API from abuse, independent of GitHub's own rate limits.
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

module.exports = apiRateLimiter;
