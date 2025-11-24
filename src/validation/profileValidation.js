const { body } = require('express-validator');

exports.validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('height')
    .optional()
    .isFloat({ min: 50, max: 300 })
    .withMessage('Height must be between 50 and 300 cm'),
  body('weight')
    .optional()
    .isFloat({ min: 20, max: 500 })
    .withMessage('Weight must be between 20 and 500 kg'),
  body('goal')
    .optional()
    .isIn([
      'lose_weight',
      'maintain_weight',
      'gain_weight',
      'build_muscle',
      'improve_health',
    ])
    .withMessage(
      'Goal must be one of: lose_weight, maintain_weight, gain_weight, build_muscle, improve_health'
    ),
  body('preferences')
    .optional()
    .isArray()
    .withMessage('Preferences must be an array of strings'),
  body('allergies')
    .optional()
    .isArray()
    .withMessage('Allergies must be an array of strings'),
];
