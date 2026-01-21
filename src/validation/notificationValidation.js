const { param, query } = require('express-validator');

const notificationValidation = {
  // Validation cho get notifications
  getNotifications: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('unreadOnly')
      .optional()
      .isBoolean()
      .withMessage('unreadOnly must be a boolean'),
    query('type')
      .optional()
      .isIn([
        'post_like',
        'post_comment',
        'comment_like',
        'comment_reply',
        'follow',
        'mention',
      ])
      .withMessage('Invalid notification type'),
  ],

  // Validation cho notificationId param
  notificationId: [
    param('notificationId')
      .notEmpty()
      .withMessage('Notification ID is required')
      .isMongoId()
      .withMessage('Invalid notification ID format'),
  ],
};

module.exports = notificationValidation;
