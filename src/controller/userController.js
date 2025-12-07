const { catchAsync } = require('../libs/util/catchAsync');
const userService = require('../service/userService');
const { createSendToken } = require('../middleware/authMiddleware');
const { validationResult } = require('express-validator');
const AppError = require('../libs/util/AppError');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(`Validation Error: ${errorMessages.join(', ')}`, 400));
  }
  next();
};

// Validation middleware for registration

// Helper function to handle validation errors

/**
 * @swagger
 * /api/v1/users/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with complete profile information
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistrationRequest'
 *           examples:
 *             newUser:
 *               summary: Register new user
 *               value:
 *                 email: "john.doe@example.com"
 *                 password: "SecurePass123"
 *                 name: "John Doe"
 *                 age: 25
 *                 gender: "male"
 *                 height: 175
 *                 weight: 70
 *                 activity: "moderately_active"
 *                 goal: "build_muscle"
 *                 preferences: ["vegetarian", "high_protein"]
 *                 allergies: ["nuts"]
 *                 role: "user"
 *                 favoriteFoods: []
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegistrationResponse'
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const registerUser = catchAsync(async (req, res, next) => {
  const userData = req.body;

  const result = await userService.registerUser(userData);

  // Return registration response with verification message
  res.status(201).json({
    success: true,
    message: result.message || 'User registered successfully! Please check your email for verification code.',
    data: {
      user: result
    }
  });
});

/**
 * @swagger
 * /api/v1/users/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLoginRequest'
 *           examples:
 *             login:
 *               summary: User login
 *               value:
 *                 email: "john.doe@example.com"
 *                 password: "SecurePass123"
 *     responses:
 *       200:
 *         description: Login successful (returns access & refresh tokens and user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EnhancedAuthResponse'
 *       401:
 *         description: Invalid credentials or account deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await userService.loginUser(email, password);

  createSendToken(user, 200, res, 'Login successful');
});

/**
 * @swagger
 * /api/v1/users/change-password:
 *   patch:
 *     summary: Change user password
 *     description: Change the password for the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordChangeRequest'
 *           examples:
 *             changePassword:
 *               summary: Change password
 *               value:
 *                 currentPassword: "OldPass123"
 *                 newPassword: "NewSecurePass456"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error or incorrect current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const result = await userService.changePassword(
    req.user._id,
    currentPassword,
    newPassword
  );

  return res.ok(result.message, 200);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * @swagger
 * /api/v1/users/deactivate:
 *   patch:
 *     summary: Deactivate user account
 *     description: Deactivate the currently authenticated user's account
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated successfully
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
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const deactivateAccount = catchAsync(async (req, res, next) => {
  const result = await userService.deactivateUser(req.user._id);

  return res.ok(result.message, 200);

  // res.status(200).json({
  //   success: true,
  //   message: result.message
  // });
});

/**
 * @swagger
 * /api/v1/users/daily-calorie-needs:
 *   get:
 *     summary: Get daily calorie needs for current user
 *     description: Calculates and returns the estimated daily calorie requirement based on the authenticated user's profile (age, gender, height, weight, goal).
 *     tags: [User Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily calorie needs calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyCalorieNeedsResponse'
 *       401:
 *         description: Authentication required
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const getDailyCalorieNeeds = catchAsync(async (req, res, next) => {
  const result = await userService.getDailyCalorieNeeds(req.user._id);
  return res.ok(result, 200);
});

module.exports = {
  registerUser,
  loginUser,
  changePassword,
  deactivateAccount,
  handleValidationErrors,
  getDailyCalorieNeeds,
};
