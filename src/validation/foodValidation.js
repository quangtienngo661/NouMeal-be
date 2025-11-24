const { body, param, query } = require('express-validator');
const AppError = require('../libs/util/AppError');

// Enums based on foodModel.js
const CATEGORY_VALUES = [
  'fruits',
  'vegetables',
  'grains',
  'protein',
  'dairy',
  'fats',
  'beverages',
  'snacks',
  'desserts',
  'spices',
];

const MEAL_VALUES = ['breakfast', 'lunch', 'dinner', 'snack'];

const ALLERGEN_VALUES = [
  'peanuts',
  'tree_nuts',
  'milk',
  'eggs',
  'wheat_gluten',
  'fish',
  'shellfish',
  'soy',
  'corn',
  'sesame',
  'pineapple',
  'strawberry',
  'banana',
  'tomato',
  'apple',
  'chocolate',
  'honey',
  'mustard',
  'other',
];

// Common validators for nested objects
const nutritionalInfoValidators = [
  body('nutritionalInfo')
    .optional()
    .isObject()
    .withMessage('nutritionalInfo must be an object'),
  body('nutritionalInfo.calories')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('calories must be a non-negative number'),
  body('nutritionalInfo.protein')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('protein must be a non-negative number'),
  body('nutritionalInfo.carbohydrates')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('carbohydrates must be a non-negative number'),
  body('nutritionalInfo.fat')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('fat must be a non-negative number'),
  body('nutritionalInfo.fiber')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('fiber must be a non-negative number'),
  body('nutritionalInfo.sugar')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('sugar must be a non-negative number'),
  body('nutritionalInfo.sodium')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('sodium must be a non-negative number'),
  body('nutritionalInfo.cholesterol')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('cholesterol must be a non-negative number'),
];

const ingredientsValidators = [
  body('ingredients')
    .optional()
    .isArray()
    .withMessage('ingredients must be an array'),
  body('ingredients.*.name')
    .if(body('ingredients').exists())
    .notEmpty()
    .withMessage('ingredients[*].name is required')
    .bail()
    .isString()
    .withMessage('ingredients[*].name must be a string'),
  body('ingredients.*.amount')
    .optional()
    .isString()
    .withMessage('ingredients[*].amount must be a string'),
];

// Validators
exports.validateFoodIdParam = [
  param('foodId').isMongoId().withMessage('Invalid foodId'),
];

exports.validateCreateFood = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: 100 })
    .withMessage('name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('description cannot exceed 500 characters'),
  body('instructions')
    .isArray()
    .withMessage('instructions must be an array')
    .custom((array) => {
      if (array === undefined || array.length === 0) {
        throw new AppError('Instructions array cannot be empty');
      }

      return true;
    }),
  body('instructions.*')
    .optional()
    .isObject()
    .withMessage('each instruction must be an object'),
  body('instructions.*.step')
    .optional()
    .isInt({ min: 1 })
    .withMessage('instructions[*].step must be an integer >= 1'),
  body('instructions.*.description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('instructions[*].description cannot exceed 500 characters'),
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('imageUrl must be a valid URL'),
  body('category')
    .notEmpty()
    .withMessage('category is required')
    .isIn(CATEGORY_VALUES)
    .withMessage(
      'category must be one of: ' + CATEGORY_VALUES.join(', ')
    ),
  body('meal')
    .optional()
    .isIn(MEAL_VALUES)
    .withMessage('meal must be one of: ' + MEAL_VALUES.join(', ')),
  ...ingredientsValidators,
  ...nutritionalInfoValidators,
  body('allergens')
    .optional()
    .isArray()
    .withMessage('allergens must be an array'),
  body('allergens.*')
    .optional()
    .isIn(ALLERGEN_VALUES)
    .withMessage(
      'allergens must contain only: ' + ALLERGEN_VALUES.join(', ')
    ),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('tags must be an array of strings'),
  body('tags.*')
    .optional()
    .isString()
    .withMessage('tags must be strings'),
];

exports.validateUpdateFood = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('description cannot exceed 500 characters'),
  body('instructions')
    .optional()
    .isArray()
    .withMessage('instructions must be an array'),
  body('instructions.*')
    .optional()
    .isObject()
    .withMessage('each instruction must be an object'),
  body('instructions.*.step')
    .optional()
    .isInt({ min: 1 })
    .withMessage('instructions[*].step must be an integer >= 1'),
  body('instructions.*.description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('instructions[*].description cannot exceed 500 characters'),
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('imageUrl must be a valid URL'),
  body('category')
    .optional()
    .isIn(CATEGORY_VALUES)
    .withMessage(
      'category must be one of: ' + CATEGORY_VALUES.join(', ')
    ),
  body('meal')
    .optional()
    .isIn(MEAL_VALUES)
    .withMessage('meal must be one of: ' + MEAL_VALUES.join(', ')),
  ...ingredientsValidators,
  ...nutritionalInfoValidators,
  body('allergens')
    .optional()
    .isArray()
    .withMessage('allergens must be an array'),
  body('allergens.*')
    .optional()
    .isIn(ALLERGEN_VALUES)
    .withMessage(
      'allergens must contain only: ' + ALLERGEN_VALUES.join(', ')
    ),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('tags must be an array of strings'),
  body('tags.*')
    .optional()
    .isString()
    .withMessage('tags must be strings'),
];
