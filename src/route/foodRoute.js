const express = require('express');
const router = express.Router();
const {
    getFoods,
    foodsRecommendation,
    weeklyFoodsRecommendation,
    getFoodById,
    createFood,
    updateFood,
    deleteFood
} = require('../controller/foodController');
const { authenticate } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validator');
const {
    validateCreateFood,
    validateUpdateFood,
    validateFoodIdParam,
} = require('../validation/foodValidation');

// TODO: add authentication middleware later

// 📦 READ operations
router.get('/', getFoods);
router.get('/recommended', authenticate, foodsRecommendation);
router.get('/weekly-recommended', authenticate, weeklyFoodsRecommendation);
router.get('/:foodId', validateFoodIdParam, handleValidationErrors, getFoodById);

// ✏️ CREATE / UPDATE / DELETE
router.post('/', authenticate, validateCreateFood, handleValidationErrors, createFood);
router.patch(
    '/:foodId',
    authenticate,
    validateFoodIdParam,
    validateUpdateFood,
    handleValidationErrors,
    updateFood
);
router.delete(
    '/:foodId',
    authenticate,
    validateFoodIdParam,
    handleValidationErrors,
    deleteFood
);

module.exports = router;