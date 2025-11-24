const { body, validationResult } = require('express-validator');
const { catchAsync } = require('../libs/util/catchAsync');
const AppError = require('../libs/util/AppError');
const userService = require('../service/userService');
const emailService = require('../libs/util/emailService');
const { 
  createSendToken, 
  generateTokenPair, 
  verifyRefreshToken 
} = require('../middleware/authMiddleware');
const User = require('../model/userModel');

// Validation middleware for email verification
const validateEmailVerification = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
];

// Validation middleware for forgot password
const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

// Validation middleware for reset password
const validateResetPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Validation middleware for refresh token
const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(`Validation Error: ${errorMessages.join(', ')}`, 400));
  }
  next();
};

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email with OTP
 *     description: Verify user's email address using the 6-digit OTP sent during registration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.doe@example.com"
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP received via email
 *                 example: "123456"
 *           examples:
 *             verifyEmail:
 *               summary: Verify email with OTP
 *               value:
 *                 email: "john.doe@example.com"
 *                 otp: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const verifyEmail = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  // Find user by email (including OTP fields)
  const user = await User.findOne({ email })
    .select('+emailVerificationOTP +emailVerificationOTPExpires');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.isEmailVerified) {
    return next(new AppError('Email is already verified', 400));
  }

  // Verify OTP
  if (!user.verifyEmailOTP(otp)) {
    return next(new AppError('Invalid or expired OTP', 400));
  }

  // Mark email as verified and clear OTP
  user.isEmailVerified = true;
  user.clearEmailVerificationOTP();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully! You can now access all features.'
  });
});

/**
 * @swagger
 * /api/v1/auth/resend-verification:
 *   post:
 *     summary: Resend email verification OTP
 *     description: Resend the 6-digit OTP for email verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Email already verified or other error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const resendVerificationEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.isEmailVerified) {
    return next(new AppError('Email is already verified', 400));
  }

  // Generate new OTP
  const otp = user.setEmailVerificationOTP();
  await user.save({ validateBeforeSave: false });

  // Send email
  try {
    await emailService.sendEmailVerificationOTP(user.email, user.name, otp);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully! Please check your inbox.'
    });
  } catch (error) {
    // Clear OTP on email failure
    user.clearEmailVerificationOTP();
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Failed to send verification email. Please try again.', 500));
  }
});

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send a 6-digit OTP to user's email for password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.doe@example.com"
 *           examples:
 *             forgotPassword:
 *               summary: Request password reset
 *               value:
 *                 email: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to send email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('User not found with this email address', 404));
  }

  if (!user.isActive) {
    return next(new AppError('Account is deactivated. Please contact support.', 400));
  }

  // Generate password reset OTP
  const otp = user.setPasswordResetOTP();
  await user.save({ validateBeforeSave: false });

  console.log(`\n🔐 PASSWORD RESET OTP FOR DEVELOPMENT 🔐`);
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 OTP: ${otp}`);
  console.log(`⏰ Expires: ${user.passwordResetOTPExpires}`);
  console.log(`🔐 =========================================\n`);

  // Send email
  try {
    await emailService.sendPasswordResetOTP(user.email, user.name, otp);

    res.status(200).json({
      success: true,
      message: 'Password reset code sent to your email! Please check your inbox.'
    });
  } catch (error) {
    console.warn('⚠️ Email sending failed (development mode):', error.message);
    
    // In development, don't clear OTP and return success with dev info
    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({
        success: true,
        message: 'Password reset OTP generated successfully! Use dev-otp endpoint to get OTP for testing.',
        development: {
          note: 'Email sending failed. Use POST /api/v1/auth/dev-otp to retrieve the OTP.',
          email: email,
          otpInConsole: 'Check server console for OTP details'
        }
      });
    }

    // In production, clear OTP and return error
    user.clearPasswordResetOTP();
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Failed to send password reset email. Please try again.', 500));
  }
});

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     description: Reset user's password using the 6-digit OTP sent to their email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.doe@example.com"
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP received via email
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 description: New password (min 6 chars, must contain uppercase, lowercase, and number)
 *                 example: "NewSecurePass123"
 *           examples:
 *             resetPassword:
 *               summary: Reset password with OTP
 *               value:
 *                 email: "john.doe@example.com"
 *                 otp: "123456"
 *                 newPassword: "NewSecurePass123"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const resetPassword = catchAsync(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  // Find user by email (including OTP fields)
  const user = await User.findOne({ email })
    .select('+passwordResetOTP +passwordResetOTPExpires');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Verify OTP
  if (!user.verifyPasswordResetOTP(otp)) {
    return next(new AppError('Invalid or expired OTP', 400));
  }

  // Set new password and clear OTP
  user.password = newPassword;
  user.clearPasswordResetOTP();
  
  // Clear all refresh tokens for security
  user.refreshToken = undefined;
  user.refreshTokenExpires = undefined;
  
  await user.save();

  // Generate new tokens and send response
  await createSendToken(user, 200, res, 'Password reset successfully! You are now logged in.');
});

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Generate a new access token using a valid refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *           examples:
 *             refreshToken:
 *               summary: Refresh access token
 *               value:
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: New access token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Access token refreshed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: New access token
 *                     refreshToken:
 *                       type: string
 *                       description: New refresh token (optional, may be same as input)
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken: clientRefreshToken } = req.body;

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(clientRefreshToken);
  } catch (error) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }

  // Check if it's actually a refresh token
  if (decoded.type !== 'refresh') {
    return next(new AppError('Invalid token type', 401));
  }

  // Find user and verify refresh token in database
  const user = await User.findById(decoded.id)
    .select('+refreshToken +refreshTokenExpires');

  if (!user) {
    return next(new AppError('User no longer exists', 404));
  }

  // Check if refresh token matches and is not expired
  if (
    user.refreshToken !== clientRefreshToken ||
    !user.refreshTokenExpires ||
    user.refreshTokenExpires < new Date()
  ) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }

  // Check if user is still active
  if (!user.isActive) {
    return next(new AppError('Account is deactivated', 401));
  }

  // Generate new token pair
  await createSendToken(user, 200, res, 'Access token refreshed successfully');
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logout user by invalidating their refresh token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const logout = catchAsync(async (req, res, next) => {
  // Clear refresh token from database
  const user = await User.findById(req.user._id);
  if (user) {
    user.refreshToken = undefined;
    user.refreshTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @swagger
 * /api/v1/auth/dev-get-otp:
 *   post:
 *     summary: Get OTP for development testing
 *     description: Retrieve the current OTP for email verification or password reset (development only)
 *     tags: [Development]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "alex.nguyen@example.com"
 *               type:
 *                 type: string
 *                 enum: [email_verification, password_reset]
 *                 description: Type of OTP to retrieve
 *                 example: "email_verification"
 *           examples:
 *             getEmailOTP:
 *               summary: Get email verification OTP
 *               value:
 *                 email: "alex.nguyen@example.com"
 *                 type: "email_verification"
 *             getPasswordOTP:
 *               summary: Get password reset OTP
 *               value:
 *                 email: "alex.nguyen@example.com"
 *                 type: "password_reset"
 *     responses:
 *       200:
 *         description: OTP retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP retrieved successfully (development mode)"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "alex.nguyen@example.com"
 *                     otp:
 *                       type: string
 *                       example: "123456"
 *                     type:
 *                       type: string
 *                       example: "email_verification"
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-10-31T14:45:00.000Z"
 *                     timeRemaining:
 *                       type: string
 *                       example: "245 seconds"
 *                     isExpired:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not available in production
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found or no valid OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const getDevOTP = catchAsync(async (req, res, next) => {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return next(new AppError('This endpoint is only available in development mode', 403));
  }

  const { email, type = 'email_verification' } = req.body;

  if (!email) {
    return next(new AppError('Email is required', 400));
  }

  if (!['email_verification', 'password_reset'].includes(type)) {
    return next(new AppError('Type must be either "email_verification" or "password_reset"', 400));
  }

  // Find user with OTP fields
  const selectFields = type === 'email_verification' 
    ? '+emailVerificationOTP +emailVerificationOTPExpires'
    : '+passwordResetOTP +passwordResetOTPExpires';
    
  const user = await User.findOne({ email }).select(selectFields);

  if (!user) {
    return next(new AppError('User not found with this email address', 404));
  }

  // Get the appropriate OTP and expiration
  let otp, expiresAt;
  if (type === 'email_verification') {
    otp = user.emailVerificationOTP;
    expiresAt = user.emailVerificationOTPExpires;
  } else {
    otp = user.passwordResetOTP;
    expiresAt = user.passwordResetOTPExpires;
  }

  // Check if OTP exists and is valid
  if (!otp || !expiresAt) {
    return next(new AppError(`No ${type.replace('_', ' ')} OTP found. Please request a new one.`, 404));
  }

  const now = new Date();
  const isExpired = expiresAt < now;
  const timeRemaining = isExpired ? 0 : Math.ceil((expiresAt - now) / 1000);

  res.status(200).json({
    success: true,
    message: `OTP retrieved successfully (development mode)`,
    data: {
      email: user.email,
      otp: otp,
      type: type,
      expiresAt: expiresAt,
      timeRemaining: `${timeRemaining} seconds`,
      isExpired: isExpired,
      status: isExpired ? 'EXPIRED' : 'VALID'
    }
  });
});

module.exports = {
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
};