const { default: rateLimit } = require('express-rate-limit');
const AppError = require('../libs/util/AppError');

exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  handler: () => {
    throw new AppError(
      'Too many requests from this IP, please try again later.',
      429
    );
  },
});
