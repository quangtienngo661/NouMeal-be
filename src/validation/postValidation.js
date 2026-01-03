const { body, param, query } = require('express-validator');

exports.validateCreatePost = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Post text is required')
    .isLength({ max: 5000 })
    .withMessage('Text cannot exceed 5000 characters'),

  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be public, followers, or private'),

  body('foods').optional().isArray().withMessage('Foods must be an array'),

  body('foods.*')
    .optional()
    .isMongoId()
    .withMessage('Each food must be a valid MongoDB ID'),

  body('hashtags')
    .optional()
    .isArray()
    .withMessage('Hashtags must be an array'),

  body('hashtags.*')
    .optional()
    .isString()
    .withMessage('Each hashtag must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each hashtag must be between 1 and 50 characters'),
];

exports.validateUpdatePost = [
  param('postId').isMongoId().withMessage('Invalid post ID'),

  body('author').not().exists().withMessage('Cannot change post author'),

  body('engagement')
    .not()
    .exists()
    .withMessage('Cannot manually update engagement metrics'),

  body('createdAt')
    .not()
    .exists()
    .withMessage('Cannot manually update creation date'),

  body('text')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Text cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Text cannot exceed 5000 characters'),

  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be public, followers, or private'),

  body('foods').optional().isArray().withMessage('Foods must be an array'),

  body('foods.*')
    .optional()
    .isMongoId()
    .withMessage('Each food must be a valid MongoDB ID'),

  body('hashtags')
    .optional()
    .isArray()
    .withMessage('Hashtags must be an array'),

  body('hashtags.*')
    .optional()
    .isString()
    .withMessage('Each hashtag must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each hashtag must be between 1 and 50 characters'),
];

exports.validateGetFeedQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn([
      'createdAt',
      'updatedAt',
      'engagement.likes_count',
      'engagement.comments_count',
    ])
    .withMessage('Invalid sortBy parameter'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

exports.validatePostId = [
  param('postId').isMongoId().withMessage('Invalid post ID'),
];

exports.validateAuthorId = [
  param('authorId').isMongoId().withMessage('Invalid author ID'),
];

exports.validateFoodId = [
  param('foodId').isMongoId().withMessage('Invalid food ID'),
];

exports.validateHashtag = [
  param('hashtag')
    .trim()
    .notEmpty()
    .withMessage('Hashtag cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('Hashtag must be between 1 and 50 characters'),
];

exports.validateSearchQuery = [
  query('q')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Search query cannot be empty')
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn([
      'createdAt',
      'updatedAt',
      'engagement.likes_count',
      'engagement.comments_count',
    ])
    .withMessage('Invalid sortBy parameter'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

exports.validateGetPostsQuery = [
  query('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be public, followers, or private'),

  query('author')
    .optional()
    .isMongoId()
    .withMessage('Author must be a valid MongoDB ID'),

  query('foodId')
    .optional()
    .isMongoId()
    .withMessage('Food ID must be a valid MongoDB ID'),

  query('hashtags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return true; // Single hashtag
      }
      if (Array.isArray(value)) {
        return value.every((tag) => typeof tag === 'string');
      }
      return false;
    })
    .withMessage('Hashtags must be a string or array of strings'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn([
      'createdAt',
      'updatedAt',
      'engagement.likes_count',
      'engagement.comments_count',
    ])
    .withMessage('Invalid sortBy parameter'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

exports.validateTrendingHashtagsQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
];
