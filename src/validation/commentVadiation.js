const { body, param, query } = require('express-validator');

// Validation middleware for creating a comment
exports.validateCreateComment = [
  body('post')
    .notEmpty()
    .withMessage('Post ID is required')
    .isMongoId()
    .withMessage('Invalid post ID format'),

  body('content.text')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content must be between 1 and 1000 characters'),

  body('content.media')
    .optional()
    .isArray()
    .withMessage('Media must be an array')
    .custom((media) => {
      if (media.length > 4) {
        throw new Error('Cannot upload more than 4 images');
      }
      return true;
    }),

  body('content.media.*.type')
    .optional()
    .isIn(['image'])
    .withMessage('Media type must be "image"'),

  body('content.media.*.url')
    .optional()
    .isURL()
    .withMessage('Invalid media URL'),

  body('content.media.*.thumbnailUrl')
    .optional()
    .isURL()
    .withMessage('Invalid thumbnail URL'),

  body('parent_comment')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid parent comment ID format');
      }
      return true;
    }),

  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be one of: public, followers, private'),
];

// Validation middleware for updating a comment
exports.validateUpdateComment = [
  param('commentId')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format'),

  body('content.text')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Comment content cannot be empty')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content must be between 1 and 1000 characters'),

  body('content.media')
    .optional()
    .isArray()
    .withMessage('Media must be an array')
    .custom((media) => {
      if (media.length > 4) {
        throw new Error('Cannot upload more than 4 images');
      }
      return true;
    }),

  body('content.media.*.type')
    .optional()
    .isIn(['image'])
    .withMessage('Media type must be "image"'),

  body('content.media.*.url')
    .optional()
    .isURL()
    .withMessage('Invalid media URL'),

  body('content.media.*.thumbnailUrl')
    .optional()
    .isURL()
    .withMessage('Invalid thumbnail URL'),

  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be one of: public, followers, private'),
];

// Validation middleware for deleting a comment
exports.validateDeleteComment = [
  param('commentId')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format'),
];

// Validation middleware for getting a single comment
exports.validateGetComment = [
  param('commentId')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format'),
];

// Validation middleware for getting comments list
exports.validateGetComments = [
  query('post').optional().isMongoId().withMessage('Invalid post ID format'),

  query('author')
    .optional()
    .isMongoId()
    .withMessage('Invalid author ID format'),

  query('parent_comment')
    .optional()
    .custom((value) => {
      if (value === '' || value === 'null') return true;
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid parent comment ID format');
      }
      return true;
    }),

  query('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be one of: public, followers, private'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sort')
    .optional()
    .isIn(['newest', 'oldest', 'most_liked'])
    .withMessage('Sort must be one of: newest, oldest, most_liked'),
];

// Validation middleware for liking a comment
exports.validateLikeComment = [
  param('commentId')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format'),
];

// Validation middleware for unliking a comment
exports.validateUnlikeComment = [
  param('commentId')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format'),
];

// Validation middleware for getting comment replies
exports.validateGetReplies = [
  param('commentId')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

// Validation for getting comments by post
exports.validateGetCommentsByPost = [
  param('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .isMongoId()
    .withMessage('Invalid post ID format'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];
