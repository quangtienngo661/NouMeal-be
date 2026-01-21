const { catchAsync } = require('../libs/util/catchAsync');
const userService = require('../service/userService');
const { createSendToken } = require('../middleware/authMiddleware');
const { validationResult } = require('express-validator');
const AppError = require('../libs/util/AppError');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return next(
      new AppError(`Validation Error: ${errorMessages.join(', ')}`, 400)
    );
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
    message:
      result.message ||
      'User registered successfully! Please check your email for verification code.',
    data: {
      user: result,
    },
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
 * /api/v1/users/follow/{targetUserId}:
 *   post:
 *     summary: Follow a user
 *     description: Follow another user by their user ID. Returns the followed user's public profile information.
 *     tags: [User Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to follow
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Successfully followed the user
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
 *                   example: "You are now following John Doe"
 *                 data:
 *                   type: object
 *                   properties:
 *                     following:
 *                       type: object
 *                       description: Public profile of the followed user
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john.doe@example.com"
 *                         age:
 *                           type: number
 *                           example: 25
 *                         gender:
 *                           type: string
 *                           example: "male"
 *                         height:
 *                           type: number
 *                           example: 175
 *                         weight:
 *                           type: number
 *                           example: 70
 *                         activity:
 *                           type: string
 *                           example: "moderately_active"
 *                         goal:
 *                           type: string
 *                           example: "build_muscle"
 *                         preferences:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["vegetarian", "high_protein"]
 *                         allergies:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["nuts"]
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Bad request - Cannot follow yourself or already following
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               selfFollow:
 *                 summary: Trying to follow yourself
 *                 value:
 *                   success: false
 *                   message: "You cannot follow yourself"
 *                   statusCode: 400
 *               alreadyFollowing:
 *                 summary: Already following the user
 *                 value:
 *                   success: false
 *                   message: "You are already following this user"
 *                   statusCode: 400
 *       401:
 *         description: Unauthorized - Authentication required
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
 *             examples:
 *               userNotFound:
 *                 summary: Current user not found
 *                 value:
 *                   success: false
 *                   message: "User not found"
 *                   statusCode: 404
 *               targetUserNotFound:
 *                 summary: Target user not found
 *                 value:
 *                   success: false
 *                   message: "Target user not found"
 *                   statusCode: 404
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const followUser = catchAsync(async (req, res, next) => {
  const { targetUserId } = req.params;
  const result = await userService.followUser(req.user._id, targetUserId);

  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      following: result.following,
    },
  });
});

/**
 * @swagger
 * /api/v1/users/unfollow/{targetUserId}:
 *   delete:
 *     summary: Unfollow a user
 *     description: Unfollow a user that you are currently following. Removes the user from your following list.
 *     tags: [User Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to unfollow
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Successfully unfollowed the user
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
 *                   example: "Unfollowed successfully"
 *             example:
 *               success: true
 *               message: "Unfollowed successfully"
 *       400:
 *         description: Bad request - Cannot unfollow yourself or not following
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               selfUnfollow:
 *                 summary: Trying to unfollow yourself
 *                 value:
 *                   success: false
 *                   message: "You cannot unfollow yourself"
 *                   statusCode: 400
 *               notFollowing:
 *                 summary: Not following the user
 *                 value:
 *                   success: false
 *                   message: "You are not following this user"
 *                   statusCode: 400
 *       401:
 *         description: Unauthorized - Authentication required
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
const unfollowUser = catchAsync(async (req, res, next) => {
  const { targetUserId } = req.params;
  const result = await userService.unfollowUser(req.user._id, targetUserId);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

module.exports = {
  registerUser,
  loginUser,
  changePassword,
  deactivateAccount,
  handleValidationErrors,
  followUser,
  unfollowUser,
};
