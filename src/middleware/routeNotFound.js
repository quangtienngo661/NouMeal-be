const AppError = require("../libs/util/AppError");

exports.routeNotFound = (req, res, next) => {
  throw new AppError('Route not found', 404);
};
