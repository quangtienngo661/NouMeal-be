const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getDevOTP,
  validateEmailVerification,
  validateForgotPassword,
  validateResetPassword,
  validateRefreshToken,
  handleValidationErrors
} = require('../controller/authController');

// Email verification routes
router.post('/verify-email', validateEmailVerification, handleValidationErrors, verifyEmail);
router.post('/resend-verification', validateForgotPassword, handleValidationErrors, resendVerificationEmail);

// Password reset routes
router.post('/forgot-password', validateForgotPassword, handleValidationErrors, forgotPassword);
router.post('/reset-password', validateResetPassword, handleValidationErrors, resetPassword);

// Token management routes
router.post('/refresh-token', validateRefreshToken, handleValidationErrors, refreshToken);
router.post('/logout', authenticate, logout);

// Development only - Get OTP for testing
router.post('/dev-otp', getDevOTP);

module.exports = router;