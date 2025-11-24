const { body, validationResult } = require('express-validator');
const { catchAsync } = require('../libs/util/catchAsync');
const AppError = require('../libs/util/AppError');
const userService = require('../service/userService');

/**
 * @swagger
 * /api/v1/profile:
 *   patch:
 *     summary: Update user profile
 *     description: Update the profile information of the currently authenticated user
 *     tags: [User Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfileUpdateRequest'
 *           examples:
 *             updateProfile:
 *               summary: Update user profile
 *               value:
 *                 name: "John Updated"
 *                 age: 26
 *                 weight: 72
 *                 goal: "build_muscle"
 *                 preferences: ["vegetarian", "high_protein", "organic"]
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: "Profile updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
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
const updateProfile = catchAsync(async (req, res, next) => {
  const updateData = req.body;

  const updatedUser = await userService.updateUserProfile(
    req.user._id,
    updateData
  );

  return res.ok(updatedUser, 'Profile updated successfully', 200);

  // res.status(200).json({
  //   success: true,
  //   message: 'Profile updated successfully',
  //   data: {
  //     user: updatedUser
  //   }
  // });
});

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve user information by user ID (for admin or specific use cases)
 *     tags: [User Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: User retrieved successfully
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
 *                   example: "User retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid user ID
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
const getUserById = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const user = await userService.getUserById(userId);

  return res.ok(user, 'Profile retrieved successfully', 200);

  // res.status(200).json({
  //   success: true,
  //   message: 'User retrieved successfully',
  //   data: {
  //     user
  //   }
  // });
});

// Get current user's profile (for GET /profile route)
const getProfile = catchAsync(async (req, res, next) => {
  const user = await userService.getUserById(req.user._id);

  return res.ok(user, 'Profile retrieved successfully', 200);
});

module.exports = {
  updateProfile,
  getUserById,
  getProfile,
};
