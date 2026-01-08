const express = require('express');
const router = express.Router();
const { authenticate, restrictTo } = require('../middleware/authMiddleware');
const { getAllUsers, promoteToAdmin, demoteToUser, toggleUserStatus } = require('../controller/adminController');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only operations for user management
 */

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all user profiles
 *     description: Retrieve a paginated list of all user profiles. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filter by user role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   example: Users retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         totalUsers:
 *                           type: integer
 *                           example: 50
 *                         limit:
 *                           type: integer
 *                           example: 10
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/users', authenticate, restrictTo('admin'), getAllUsers);

/**
 * @swagger
 * /api/v1/admin/promote:
 *   post:
 *     summary: Promote a user to admin
 *     description: Promote an existing user to admin role by email or userId. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email of the user to promote
 *                 example: user@example.com
 *               userId:
 *                 type: string
 *                 description: ID of the user to promote
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: User promoted to admin successfully
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
 *                   example: User promoted to admin
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *       400:
 *         description: Bad request - Provide email or userId
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
router.post('/promote', authenticate, restrictTo('admin'), promoteToAdmin);

/**
 * @swagger
 * /api/v1/admin/demote:
 *   post:
 *     summary: Demote an admin to user
 *     description: Demote an existing admin to regular user role by email or userId. Admin only. Admins cannot demote themselves.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email of the admin to demote
 *                 example: admin@example.com
 *               userId:
 *                 type: string
 *                 description: ID of the admin to demote
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Admin demoted to user successfully
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
 *                   example: Admin demoted to user
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: admin@example.com
 *       400:
 *         description: Bad request - Provide email or userId, or cannot demote yourself
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
router.post('/demote', authenticate, restrictTo('admin'), demoteToUser);

/**
 * @swagger
 * /api/v1/admin/users/{userId}/status:
 *   patch:
 *     summary: Activate or deactivate a user
 *     description: Toggle a user's active status by their userId. Admin only. Admins cannot deactivate themselves.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to activate/deactivate
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Set to true to activate, false to deactivate
 *                 example: false
 *     responses:
 *       200:
 *         description: User status updated successfully
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
 *                   example: User deactivated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Bad request - isActive must be a boolean or cannot deactivate yourself
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: isActive must be a boolean value
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: User not found
 */
router.patch('/users/:userId/status', authenticate, restrictTo('admin'), toggleUserStatus);

module.exports = router;
