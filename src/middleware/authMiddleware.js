const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { catchAsync } = require('../libs/util/catchAsync');
const AppError = require('../libs/util/AppError');
const User = require('../model/userModel');

// Generate Access Token (short-lived)
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m', // 15 minutes
  });
};

// Generate Refresh Token (long-lived)
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // 7 days
  });
};

// Generate both tokens
const generateTokenPair = (userId) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);
  return { accessToken, refreshToken };
};

// Legacy function for backward compatibility
const generateToken = (userId) => {
  return generateAccessToken(userId);
};

// Verify JWT token and authenticate user
const authenticate = catchAsync(async (req, res, next) => {
  // 1) Get token from header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again!', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(
        new AppError('Your token has expired! Please log in again.', 401)
      );
    }
    return next(new AppError('Authentication failed', 401));
  }

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user is active
  if (!currentUser.isActive) {
    return next(
      new AppError(
        'Your account has been deactivated. Please contact support.',
        401
      )
    );
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

// Middleware to restrict access to specific roles (if needed in future)
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
};

// Create and send token response (enhanced with refresh token)
const createSendToken = async (user, statusCode, res, message = 'Success') => {
  const { accessToken, refreshToken } = generateTokenPair(user._id);

  // Store refresh token in database
  user.refreshToken = refreshToken;
  user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await user.save({ validateBeforeSave: false });

  // Remove sensitive data from output
  user.password = undefined;
  user.refreshToken = undefined;

  return res.status(statusCode).json({
    success: true,
    message,
    data: {
      accessToken,
      refreshToken,
      user
    }
  });
};

// Legacy function for backward compatibility
const createSendTokenLegacy = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);

  // Remove password from output
  user.password = undefined;

  return res.ok({ token, user }, message, 200);
};

module.exports = {
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyRefreshToken,
  authenticate,
  restrictTo,
  createSendToken,
  createSendTokenLegacy,
};
