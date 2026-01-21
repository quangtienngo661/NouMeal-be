const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const notificationValidation = require('../validation/notificationVadiation');
const { authenticate } = require('../middleware/authMiddleware');

// ==================== STATIC ROUTES (MUST BE FIRST) ====================

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get(
  '/unread-count',
  authenticate,
  notificationController.getUnreadCount
);

/**
 * @route   PATCH /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/read-all', authenticate, notificationController.markAllAsRead);

/**
 * @route   DELETE /api/v1/notifications/read
 * @desc    Delete all read notifications
 * @access  Private
 */
router.delete(
  '/read',
  authenticate,
  notificationController.deleteReadNotifications
);

// ==================== GENERAL ROUTES ====================

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications with pagination and filters
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  notificationValidation.getNotifications,
  notificationController.handleValidationErrors,
  notificationController.getUserNotifications
);

// ==================== DYNAMIC ROUTES (MUST BE LAST) ====================

/**
 * @route   PATCH /api/v1/notifications/:notificationId/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.patch(
  '/:notificationId/read',
  authenticate,
  notificationValidation.notificationId,
  notificationController.handleValidationErrors,
  notificationController.markAsRead
);

/**
 * @route   DELETE /api/v1/notifications/:notificationId
 * @desc    Delete a specific notification
 * @access  Private
 */
router.delete(
  '/:notificationId',
  authenticate,
  notificationValidation.notificationId,
  notificationController.handleValidationErrors,
  notificationController.deleteNotification
);

module.exports = router;
