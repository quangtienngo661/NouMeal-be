const { body, param, query } = require('express-validator');

exports.validateCreatePost = [
  body('post_type')
    .notEmpty()
    .withMessage('Post type is required')
    .isIn(['food_review', 'recipe', 'general'])
    .withMessage('Post type must be food_review, recipe, or general'),

  body('text')
    .trim()
    .notEmpty()
    .withMessage('Post text is required')
    .isLength({ max: 5000 })
    .withMessage('Text cannot exceed 5000 characters'),

  body('images').optional().isArray().withMessage('Images must be an array'),

  body('images.*')
    .optional()
    .isString()
    .withMessage('Each image must be a string URL')
    .isURL()
    .withMessage('Each image must be a valid URL'),

  // Visibility validatio
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

  body('recipe.title')
    .if(body('post_type').equals('recipe'))
    .notEmpty()
    .withMessage('Recipe title is required for recipe posts')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Recipe title cannot exceed 200 characters'),

  body('recipe.ingredients')
    .if(body('post_type').equals('recipe'))
    .notEmpty()
    .withMessage('Ingredients are required for recipe posts')
    .isArray({ min: 1 })
    .withMessage('Recipe must have at least one ingredient'),

  body('recipe.ingredients.*.name')
    .if(body('post_type').equals('recipe'))
    .notEmpty()
    .withMessage('Ingredient name is required')
    .isString()
    .withMessage('Ingredient name must be a string')
    .trim(),

  body('recipe.ingredients.*.amount')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isString()
    .withMessage('Ingredient amount must be a string')
    .trim(),

  body('recipe.ingredients.*.unit')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isString()
    .withMessage('Ingredient unit must be a string')
    .trim(),

  body('recipe.steps')
    .if(body('post_type').equals('recipe'))
    .notEmpty()
    .withMessage('Steps are required for recipe posts')
    .isArray({ min: 1 })
    .withMessage('Recipe must have at least one step'),

  body('recipe.steps.*')
    .if(body('post_type').equals('recipe'))
    .notEmpty()
    .withMessage('Each step cannot be empty')
    .isString()
    .withMessage('Each step must be a string')
    .trim(),

  body('recipe.cooking_time')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isInt({ min: 0 })
    .withMessage('Cooking time must be a non-negative number'),

  body('recipe.servings')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isInt({ min: 1 })
    .withMessage('Servings must be at least 1'),

  body('recipe.difficulty')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
];

exports.validateUpdatePost = [
  param('postId').isMongoId().withMessage('Invalid post ID'),

  body('post_type')
    .not()
    .exists()
    .withMessage('Cannot change post type after creation'),

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

  // Images validation
  body('images').optional().isArray().withMessage('Images must be an array'),

  body('images.*')
    .optional()
    .isString()
    .withMessage('Each image must be a string URL')
    .isURL()
    .withMessage('Each image must be a valid URL'),

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

  body('recipe.title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Recipe title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Recipe title cannot exceed 200 characters'),

  body('recipe.ingredients')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Recipe must have at least one ingredient'),

  body('recipe.ingredients.*.name')
    .optional()
    .notEmpty()
    .withMessage('Ingredient name is required')
    .isString()
    .withMessage('Ingredient name must be a string')
    .trim(),

  body('recipe.ingredients.*.amount')
    .optional()
    .isString()
    .withMessage('Ingredient amount must be a string')
    .trim(),

  body('recipe.ingredients.*.unit')
    .optional()
    .isString()
    .withMessage('Ingredient unit must be a string')
    .trim(),

  body('recipe.steps')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Recipe must have at least one step'),

  body('recipe.steps.*')
    .optional()
    .notEmpty()
    .withMessage('Each step cannot be empty')
    .isString()
    .withMessage('Each step must be a string')
    .trim(),

  body('recipe.cooking_time')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Cooking time must be a non-negative number'),

  body('recipe.servings')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Servings must be at least 1'),

  body('recipe.difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
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
    .isIn(['createdAt', 'engagement.likes_count', 'engagement.comments_count'])
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
    .isIn(['createdAt', 'engagement.likes_count', 'engagement.comments_count'])
    .withMessage('Invalid sortBy parameter'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

exports.validateGetPostsQuery = [
  query('post_type')
    .optional()
    .isIn(['food_review', 'recipe', 'general'])
    .withMessage('Post type must be food_review, recipe, or general'),

  query('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be public, followers, or private'),

  query('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),

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
    .isIn(['createdAt', 'engagement.likes_count', 'engagement.comments_count'])
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
