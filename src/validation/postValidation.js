const { body, param } = require('express-validator');

exports.validateCreatePost = [
  body('post_type')
    .isIn(['food_review', 'recipe', 'general'])
    .withMessage('Post type must be food_review, recipe, or general'),
  
  body('content.text')
    .trim()
    .notEmpty()
    .withMessage('Post content is required')
    .isLength({ max: 5000 })
    .withMessage('Content cannot exceed 5000 characters'),
  
  body('content.media')
    .optional()
    .isArray()
    .withMessage('Media must be an array'),
  
  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be public, followers, or private'),

  // Food review validation
  body('food_review')
    .if(body('post_type').equals('food_review'))
    .notEmpty()
    .withMessage('Food review data is required for food_review posts'),
  
  body('food_review.description.name')
    .if(body('post_type').equals('food_review'))
    .optional()
    .trim()
    .isString(),
  
  body('food_review.rating')
    .if(body('post_type').equals('food_review'))
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('food_review.tags')
    .if(body('post_type').equals('food_review'))
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  // Recipe validation
  body('recipe.title')
    .if(body('post_type').equals('recipe'))
    .notEmpty()
    .withMessage('Recipe title is required for recipe posts')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Recipe title cannot exceed 200 characters'),
  
  body('recipe.ingredients')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isArray()
    .withMessage('Ingredients must be an array'),
  
  body('recipe.steps')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isArray()
    .withMessage('Steps must be an array'),
  
  body('recipe.cooking_time')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cooking time must be a positive number'),
  
  body('recipe.servings')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isInt({ min: 1 })
    .withMessage('Servings must be a positive number'),
  
  body('recipe.difficulty')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
];

exports.validateUpdatePost = [
  param('postId')
    .isMongoId()
    .withMessage('Invalid post ID'),
  
  body('post_type')
    .optional()
    .isIn(['food_review', 'recipe', 'general'])
    .withMessage('Post type must be food_review, recipe, or general'),
  
  body('content.text')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Content cannot exceed 5000 characters'),
  
  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be public, followers, or private'),
];