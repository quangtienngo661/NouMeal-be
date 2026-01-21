const { catchAsync } = require('../libs/util/catchAsync');
const notificationService = require('../service/notificationService');
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

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieve paginated list of notifications for the authenticated user with optional filtering
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of notifications per page
 *         example: 20
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Filter to show only unread notifications
 *         example: false
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [post_like, post_comment, comment_like, comment_reply, follow, mention]
 *         description: Filter by notification type
 *         example: post_like
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 50
 *                         pages:
 *                           type: integer
 *                           example: 3
 *                     unread_count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized - Authentication required
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
const getUserNotifications = catchAsync(async (req, res, next) => {
  const { page, limit, unreadOnly, type } = req.query;

  const result = await notificationService.getUserNotifications(req.user._id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    unreadOnly: unreadOnly === 'true',
    type,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: Get the total number of unread notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     unread_count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized - Authentication required
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
const getUnreadCount = catchAsync(async (req, res, next) => {
  const result = await notificationService.getUnreadCount(req.user._id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the notification to mark as read
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
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
 *                   example: "Notification marked as read"
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Notification not found
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
const markAsRead = catchAsync(async (req, res, next) => {
  const { notificationId } = req.params;

  const notification = await notificationService.markAsRead(
    notificationId,
    req.user._id
  );

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: notification,
  });
});

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Mark all unread notifications as read for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "All notifications marked as read"
 *                     modified_count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized - Authentication required
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
const markAllAsRead = catchAsync(async (req, res, next) => {
  const result = await notificationService.markAllAsRead(req.user._id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     description: Delete a specific notification for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the notification to delete
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Notification deleted successfully"
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Notification not found
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
const deleteNotification = catchAsync(async (req, res, next) => {
  const { notificationId } = req.params;

  const result = await notificationService.deleteNotification(
    notificationId,
    req.user._id
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/notifications/read:
 *   delete:
 *     summary: Delete all read notifications
 *     description: Delete all read notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Read notifications deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Read notifications deleted successfully"
 *                     deleted_count:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized - Authentication required
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
const deleteReadNotifications = catchAsync(async (req, res, next) => {
  const result = await notificationService.deleteReadNotifications(
    req.user._id
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  handleValidationErrors,
};
