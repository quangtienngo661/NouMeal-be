const express = require('express');
const router = express.Router();
const {
    getFoods,
    getTodayMeals,
    resetTodayMeals,
    weeklyFoodsRecommendation,
    getFoodById,
    updateFood,
    clearCache,
    logMeal,
    getTodayProgress,
    getAllFoodLogs,
    getFoodLog,
    createFoodByUser,
    createFoodByAdmin,
    getAdminFoods,
    getOwnFoods,
    getFoodsByUserId,
    deleteFoodByAdmin,
    deleteFoodByUser,
    checkFoodAppropriate,
    resetTodayLogs,
    updateRecommendableStatus,
    getPublicFoods,
    getNonRecommendableFoods
} = require('../controller/foodController');
const { authenticate, restrictTo } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validator');
const {
    validateCreateFood,
    validateUpdateFood,
    validateFoodIdParam,
} = require('../validation/foodValidation');
const { validateLogMeal } = require('../validation/foodLogValidation');
// 📦 READ operations
router.get('/', getFoods);
router.get('/today-meals', authenticate, getTodayMeals);
router.post('/reset-today-meals', authenticate, resetTodayMeals);
router.get('/weekly-recommended', authenticate, weeklyFoodsRecommendation);

// Get foods by source (must come before /:foodId)
router.get('/user', authenticate, getOwnFoods);
router.get('/user/:userId', authenticate, getFoodsByUserId);
router.get('/admin', authenticate, restrictTo('admin'), getAdminFoods);
router.get('/admin/public', authenticate, restrictTo('admin'), getPublicFoods);
router.get('/admin/non-recommendable', authenticate, restrictTo('admin'), getNonRecommendableFoods);

// 📝 FOOD LOGGING - Must come before /:foodId to avoid conflicts
router.post('/log', authenticate, validateLogMeal, handleValidationErrors, logMeal);
router.get('/logs', authenticate, getAllFoodLogs);
router.get('/logs/:date', authenticate, getFoodLog);
router.delete('/logs/reset', authenticate, resetTodayLogs);
router.get('/progress/today', authenticate, getTodayProgress);

// Check food appropriateness - Must come before /:foodId to avoid conflicts
router.post('/check-appropriate', authenticate, validateCreateFood, handleValidationErrors, checkFoodAppropriate);

// Food by ID - Must come after specific routes
router.get('/:foodId', validateFoodIdParam, handleValidationErrors, getFoodById);

// ✏️ CREATE / UPDATE / DELETE
router.post('/admin', authenticate, restrictTo('admin'), validateCreateFood, handleValidationErrors, createFoodByAdmin);
router.post('/user', authenticate, validateCreateFood, handleValidationErrors, createFoodByUser);

// Update recommendable status (Admin only) - Must come before /:foodId
router.patch(
    '/admin/:foodId/recommendable',
    authenticate,
    restrictTo('admin'),
    validateFoodIdParam,
    handleValidationErrors,
    updateRecommendableStatus
);

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