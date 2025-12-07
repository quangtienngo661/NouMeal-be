const { body } = require('express-validator');

exports.validateLogMeal = [
    body('foodId')
        .notEmpty()
        .withMessage('Food ID is required')
        .isMongoId()
        .withMessage('Invalid food ID format'),
];
