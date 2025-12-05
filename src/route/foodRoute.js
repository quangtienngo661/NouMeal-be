const express = require('express');
const router = express.Router();
const {
    getFoods,
    getAdaptiveRecommendation,
    weeklyFoodsRecommendation,
    getFoodById,
    createFood,
    updateFood,
    deleteFood,
    clearCache,
    logMeal,
    getTodayProgress,
    getAllFoodLogs,
    getFoodLog
} = require('../controller/foodController');
const { authenticate } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validator');
const {
    validateCreateFood,
    validateUpdateFood,
    validateFoodIdParam,
} = require('../validation/foodValidation');
const { validateLogMeal } = require('../validation/foodLogValidation');

// 📦 READ operations
router.get('/', getFoods);
router.get('/recommended', authenticate, getAdaptiveRecommendation);
router.get('/weekly-recommended', authenticate, weeklyFoodsRecommendation);

// 📝 FOOD LOGGING - Must come before /:foodId to avoid conflicts
router.post('/log', authenticate, validateLogMeal, handleValidationErrors, logMeal);
router.get('/logs', authenticate, getAllFoodLogs);
router.get('/logs/:date', authenticate, getFoodLog);
router.get('/progress/today', authenticate, getTodayProgress);

// Food by ID - Must come after specific routes
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

// Cache management
router.delete('/cache/clear', authenticate, clearCache);

module.exports = router;