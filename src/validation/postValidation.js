const { body, param } = require('express-validator');

exports.validateCreatePost = [
  body('post_type')
    .isIn(['food_review', 'recipe', 'general'])
    .withMessage('Post type must be food_review, recipe, or general'),

  // Sửa: content.text -> text (theo model)
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Post text is required')
    .isLength({ max: 5000 })
    .withMessage('Text cannot exceed 5000 characters'),

  // Sửa: content.media -> images (theo model)
  body('images').optional().isArray().withMessage('Images must be an array'),

  body('images.*')
    .optional()
    .isString()
    .withMessage('Each image must be a string URL'),

  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be public, followers, or private'),

  // Food review validation
  body('food_review')
    .if(body('post_type').equals('food_review'))
    .notEmpty()
    .withMessage('Food review data is required for food_review posts'),

  // Sửa: food_review.description.name -> food_review.dish_name
  body('food_review.dish_name')
    .if(body('post_type').equals('food_review'))
    .optional()
    .trim()
    .isString()
    .withMessage('Dish name must be a string'),

  // Thêm: Nutrition fields
  body('food_review.calories')
    .if(body('post_type').equals('food_review'))
    .optional()
    .isNumeric()
    .withMessage('Calories must be a number'),

  body('food_review.protein')
    .if(body('post_type').equals('food_review'))
    .optional()
    .isNumeric()
    .withMessage('Protein must be a number'),

  body('food_review.carbohydrates')
    .if(body('post_type').equals('food_review'))
    .optional()
    .isNumeric()
    .withMessage('Carbohydrates must be a number'),

  body('food_review.fat')
    .if(body('post_type').equals('food_review'))
    .optional()
    .isNumeric()
    .withMessage('Fat must be a number'),

  body('food_review.fiber')
    .if(body('post_type').equals('food_review'))
    .optional()
    .isNumeric()
    .withMessage('Fiber must be a number'),

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

  body('food_review.tags.*')
    .if(body('post_type').equals('food_review'))
    .optional()
    .isString()
    .withMessage('Each tag must be a string'),

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
    .notEmpty()
    .withMessage('Ingredients are required for recipe posts')
    .isArray({ min: 1 })
    .withMessage('Recipe must have at least one ingredient'),

  // Validate ingredient structure
  body('recipe.ingredients.*.name')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isString()
    .withMessage('Ingredient name must be a string'),

  body('recipe.ingredients.*.amount')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isString()
    .withMessage('Ingredient amount must be a string'),

  body('recipe.ingredients.*.unit')
    .if(body('post_type').equals('recipe'))
    .optional()
    .isString()
    .withMessage('Ingredient unit must be a string'),

  body('recipe.steps')
    .if(body('post_type').equals('recipe'))
    .notEmpty()
    .withMessage('Steps are required for recipe posts')
    .isArray({ min: 1 })
    .withMessage('Recipe must have at least one step'),

  body('recipe.steps.*')
    .if(body('post_type').equals('recipe'))
    .isString()
    .withMessage('Each step must be a string'),

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
  param('postId').isMongoId().withMessage('Invalid post ID'),

  // Không cho phép update post_type
  body('post_type')
    .not()
    .exists()
    .withMessage('Cannot change post type after creation'),

  // Sửa: content.text -> text
  body('text')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Text cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Text cannot exceed 5000 characters'),

  // Sửa: content.media -> images
  body('images').optional().isArray().withMessage('Images must be an array'),

  body('images.*')
    .optional()
    .isString()
    .withMessage('Each image must be a string URL'),

  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be public, followers, or private'),

  // Không cho phép update author
  body('author').not().exists().withMessage('Cannot change post author'),

  // Không cho phép update engagement
  body('engagement')
    .not()
    .exists()
    .withMessage('Cannot manually update engagement metrics'),
];

exports.validatePostId = [
  param('postId').isMongoId().withMessage('Invalid post ID'),
];

exports.validateSearchQuery = [
  body('q')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Search query cannot be empty')
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
];
