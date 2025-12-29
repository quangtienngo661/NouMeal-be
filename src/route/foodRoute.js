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
    getFoodLog,
    createFoodByUser,
    getAdminFoods,
    getUserFoods,
    deleteFoodByAdmin,
    deleteFoodByUser
} = require('../controller/foodController');
const { authenticate, restrictTo } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validator');
const {
    validateCreateFood,
    validateUpdateFood,
    validateFoodIdParam,
} = require('../validation/foodValidation');
const { validateLogMeal } = require('../validation/foodLogValidation');
const { createFoodByAdmin } = require('../service/foodService');

// 📦 READ operations
router.get('/', getFoods);
router.get('/recommended', authenticate, getAdaptiveRecommendation);
router.get('/weekly-recommended', authenticate, weeklyFoodsRecommendation);

// Get foods by source (must come before /:foodId)
router.get('/user', authenticate, getUserFoods);
router.get('/admin', authenticate, restrictTo('admin'), getAdminFoods);

// 📝 FOOD LOGGING - Must come before /:foodId to avoid conflicts
router.post('/log', authenticate, validateLogMeal, handleValidationErrors, logMeal);
router.get('/logs', authenticate, getAllFoodLogs);
router.get('/logs/:date', authenticate, getFoodLog);
router.get('/progress/today', authenticate, getTodayProgress);

// Food by ID - Must come after specific routes
router.get('/:foodId', validateFoodIdParam, handleValidationErrors, getFoodById);

// ✏️ CREATE / UPDATE / DELETE
router.post('/admin/create', authenticate, restrictTo('admin'), validateCreateFood, handleValidationErrors, createFoodByAdmin);
router.post('/user/create', authenticate, validateCreateFood, handleValidationErrors, createFoodByUser);
router.patch(
    '/:foodId',
    authenticate,
    validateFoodIdParam,
    validateUpdateFood,
    handleValidationErrors,
    updateFood
);

// 🗑️ DELETE operations
router.delete(
    '/admin/:foodId',
    authenticate,
    restrictTo('admin'),
    validateFoodIdParam,
    handleValidationErrors,
    deleteFoodByAdmin
);

router.delete(
    '/user/:foodId',
    authenticate,
    validateFoodIdParam,
    handleValidationErrors,
    deleteFoodByUser
);

// Cache management
router.delete('/cache/clear', authenticate, clearCache);

module.exports = router;