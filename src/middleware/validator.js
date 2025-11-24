const { validationResult } = require('express-validator');
const AppError = require('../libs/util/AppError');

exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return next(
      new AppError(`Validation Error: ${errorMessages.join(', ')}`, 400)
    );
  }
  next();
};
