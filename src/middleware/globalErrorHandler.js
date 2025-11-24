const { failure } = require('../libs/util/response');

require('dotenv').config();

exports.globalErrorHandler = (err, req, res, next) => {
  // const message = err.message;
  const { statusCode } = err;

  if (process.env.NODE_ENV !== 'production') {
    console.error('Error caught by error handler: ', err);
  }

  return failure(res, err, statusCode);
};
