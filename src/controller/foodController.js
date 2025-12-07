const FoodService = require("../service/foodService");
const FoodLogService = require("../service/foodLogService");
const { catchAsync } = require("../libs/util/catchAsync")

// 📦 READ operations
/**
 * @swagger
 * /api/v1/foods:
 *   get:
 *     summary: Get all foods
 *     description: Retrieve a list of all active foods.
 *     tags: [Foods]
 *     security: []
 *     responses:
 *       200:
 *         description: List of foods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.getFoods = catchAsync(async (req, res, next) => {
    const result = await FoodService.getFoods();
    return res.ok(result, 200);
});

/**
 * @swagger
 * /api/v1/foods/recommended:
 *   get:
 *     summary: Get food recommendations for current user
 *     description: Returns recommended foods for breakfast, lunch, dinner, and snacks based on the authenticated user's profile.
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodRecommendationWrapped'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.getAdaptiveRecommendation = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const result = await FoodService.getAdaptiveRecommendation(userId);
    return res.ok(result, 200);
});

/**
 * @swagger
 * /api/v1/foods/weekly-recommended:
 *   get:
 *     summary: Get weekly food recommendations for current user
 *     description: Returns 7 days of recommended foods (breakfast, lunch, dinner, snacks) based on the authenticated user's profile with diversity across days.
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: refresh
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Force refresh cache and generate new recommendations
 *     responses:
 *       200:
 *         description: Weekly recommendations generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2025-12-01"
 *                       dayName:
 *                         type: string
 *                         example: "Monday"
 *                       meals:
 *                         type: object
 *                         properties:
 *                           breakfast:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/FoodWithDiff'
 *                           lunch:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/FoodWithDiff'
 *                           dinner:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/FoodWithDiff'
 *                           snack:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/FoodWithDiff'
 *             example:
 *               success: true
 *               message: 200
 *               data:
 *                 - date: "2025-12-01"
 *                   dayName: "Monday"
 *                   meals:
 *                     breakfast:
 *                       - _id: "692ebe81e68471451b81aa09"
 *                         name: "Bánh Mì Thịt (Vietnamese Sandwich)"
 *                         description: "Crispy baguette with grilled pork, pâté, pickled vegetables, and cilantro."
 *                         category: "grains"
 *                         meal: "breakfast"
 *                         nutritionalInfo:
 *                           calories: 720
 *                           protein: 38
 *                           carbohydrates: 78
 *                           fat: 26
 *                         calorieDiff: 6.375
 *                         proteinDiff: 15.4
 *                         carbDiff: 6.6
 *                         fatDiff: 2.3
 *                         totalDiff: 56.175
 *                     lunch:
 *                       - _id: "692ebe81e68471451b81aa0e"
 *                         name: "Mì Quảng (Quang Noodles)"
 *                         description: "Turmeric noodles with shrimp, pork, peanuts, and rich broth."
 *                         category: "grains"
 *                         meal: "lunch"
 *                         nutritionalInfo:
 *                           calories: 920
 *                           protein: 56
 *                           carbohydrates: 110
 *                           fat: 28
 *                         calorieDiff: 31.5
 *                         proteinDiff: 15.2
 *                         carbDiff: 14.8
 *                         fatDiff: 3.6
 *                         totalDiff: 191.1
 *                     dinner:
 *                       - _id: "692ebe81e68471451b81aa0f"
 *                         name: "Cá Kho Tộ (Caramelized Fish in Clay Pot)"
 *                         description: "Catfish caramelized in clay pot with coconut water and served with rice."
 *                         category: "protein"
 *                         meal: "dinner"
 *                         nutritionalInfo:
 *                           calories: 720
 *                           protein: 48
 *                           carbohydrates: 82
 *                           fat: 20
 *                         calorieDiff: 6.375
 *                         proteinDiff: 5.4
 *                         carbDiff: 10.6
 *                         fatDiff: 3.7
 *                         totalDiff: 51.575
 *                     snack:
 *                       - _id: "692ebe81e68471451b81a9d2"
 *                         name: "Greek Yogurt"
 *                         description: "Plain low-fat Greek yogurt."
 *                         category: "dairy"
 *                         meal: "snack"
 *                         nutritionalInfo:
 *                           calories: 190
 *                           protein: 19
 *                           carbohydrates: 14
 *                           fat: 4
 *                 - date: "2025-12-02"
 *                   dayName: "Tuesday"
 *                   meals:
 *                     breakfast:
 *                       - _id: "692ebe81e68471451b81aa09"
 *                         name: "Bánh Mì Thịt (Vietnamese Sandwich)"
 *                         category: "grains"
 *                         meal: "breakfast"
 *                         nutritionalInfo:
 *                           calories: 720
 *                           protein: 38
 *                           carbohydrates: 78
 *                           fat: 26
 *                         calorieDiff: 6.375
 *                         proteinDiff: 15.4
 *                         carbDiff: 6.6
 *                         fatDiff: 2.3
 *                         totalDiff: 56.175
 *                     lunch:
 *                       - _id: "692ebe81e68471451b81aa0e"
 *                         name: "Mì Quảng (Quang Noodles)"
 *                         category: "grains"
 *                         meal: "lunch"
 *                         nutritionalInfo:
 *                           calories: 920
 *                           protein: 56
 *                           carbohydrates: 110
 *                           fat: 28
 *                         calorieDiff: 31.5
 *                         proteinDiff: 15.2
 *                         carbDiff: 14.8
 *                         fatDiff: 3.6
 *                         totalDiff: 191.1
 *                     dinner:
 *                       - _id: "692ebe81e68471451b81aa0f"
 *                         name: "Cá Kho Tộ (Caramelized Fish in Clay Pot)"
 *                         category: "protein"
 *                         meal: "dinner"
 *                         nutritionalInfo:
 *                           calories: 720
 *                           protein: 48
 *                           carbohydrates: 82
 *                           fat: 20
 *                         calorieDiff: 6.375
 *                         proteinDiff: 5.4
 *                         carbDiff: 10.6
 *                         fatDiff: 3.7
 *                         totalDiff: 51.575
 *                     snack:
 *                       - _id: "692ebe81e68471451b81a9d5"
 *                         name: "Apple"
 *                         category: "fruits"
 *                         meal: "snack"
 *                         nutritionalInfo:
 *                           calories: 130
 *                           protein: 0
 *                           carbohydrates: 34
 *                           fat: 0
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.weeklyFoodsRecommendation = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const refresh = req.query.refresh === 'true';

    const result = await FoodService.weeklyFoodRecommendation(userId, { refresh });
    return res.ok(result, 200);
});

/**
 * @swagger
 * /api/v1/foods/{foodId}:
 *   get:
 *     summary: Get a food by ID
 *     description: Retrieve details of a specific food item by its ID.
 *     tags: [Foods]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the food item
 *     responses:
 *       200:
 *         description: Food retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodItemResponse'
 *       404:
 *         description: Food not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.getFoodById = catchAsync(async (req, res, next) => {
    const { foodId } = req.params;

    const result = await FoodService.getFoodById(foodId);
    return res.ok(result, 200);
});

// ✏️ CREATE / UPDATE / DELETE
/**
 * @swagger
 * /api/v1/foods:
 *   post:
 *     summary: Create a new food
 *     description: Add a new food item to the database.
 *     tags: [Foods]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FoodCreateRequest'
 *     responses:
 *       201:
 *         description: Food created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodItemResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.createFood = catchAsync(async (req, res, next) => {
    const foodInfo = { ...req.body };

    const result = await FoodService.createFood(foodInfo, req.user._id);
    return res.ok(result, 201);
});

/**
 * @swagger
 * /api/v1/foods/{foodId}:
 *   patch:
 *     summary: Update a food
 *     description: Update fields of an existing food item by ID.
 *     tags: [Foods]
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the food to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FoodUpdateRequest'
 *     responses:
 *       200:
 *         description: Food updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodItemResponse'
 *       404:
 *         description: Food not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.updateFood = catchAsync(async (req, res, next) => {
    const { foodId } = req.params;
    const foodInfo = { ...req.body }

    const result = await FoodService.updateFood(foodId, foodInfo, req.user._id);
    return res.ok(result, 200);
});

/**
 * @swagger
 * /api/v1/foods/{foodId}:
 *   delete:
 *     summary: Delete a food
 *     description: Remove a food item by ID.
 *     tags: [Foods]
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the food to delete
 *     responses:
 *       200:
 *         description: 200
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodItemResponse'
 *       404:
 *         description: Food not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.deleteFood = catchAsync(async (req, res, next) => {
    const { foodId } = req.params;
    const result = await FoodService.deleteFood(foodId, req.user._id);
    return res.ok(result, 200);
});

/**
 * @swagger
 * /api/v1/foods/cache/clear:
 *   delete:
 *     summary: Clear all recommendation caches
 *     description: Admin endpoint to clear all weekly recommendation caches
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
exports.clearCache = catchAsync(async (req, res, next) => {
    const result = await FoodService.clearAllCache();
    return res.ok(result, 200);
});

// 📝 FOOD LOGGING
/**
 * @swagger
 * /api/v1/foods/log:
 *   post:
 *     summary: Log a consumed meal
 *     description: Log any food (from recommendations or user-posted) as consumed for tracking daily nutrition
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [foodId]
 *             properties:
 *               foodId:
 *                 type: string
 *                 description: ID of the food to log
 *                 example: "674a123bcf86cd7994390456"
 *     responses:
 *       201:
 *         description: Meal logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: number
 *                   example: 201
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "6933899ead3ca3ce89445d23"
 *                     user:
 *                       type: string
 *                       example: "692d24c28e5236c6f9ba3aa8"
 *                     food:
 *                       type: string
 *                       example: "692ebe81e68471451b81a9d0"
 *                     meal:
 *                       type: string
 *                       enum: [breakfast, lunch, dinner, snack]
 *                       example: "breakfast"
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2025-12-06"
 *                     servings:
 *                       type: number
 *                       example: 1
 *                     source:
 *                       type: string
 *                       enum: [recommended, non_recommended]
 *                       example: "non_recommended"
 *                     nutritionSnapshot:
 *                       type: object
 *                       properties:
 *                         calories:
 *                           type: number
 *                           example: 380
 *                         protein:
 *                           type: number
 *                           example: 10
 *                         carbs:
 *                           type: number
 *                           example: 62
 *                         fat:
 *                           type: number
 *                           example: 8
 *                     loggedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-12-06T01:40:46.787Z"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-12-06T01:40:46.791Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-12-06T01:40:46.791Z"
 *       400:
 *         description: Validation error or food already logged for this meal today
 *       404:
 *         description: Food not found
 */
exports.logMeal = catchAsync(async (req, res, next) => {
    const { foodId } = req.body;
    const result = await FoodLogService.logMeal(req.user._id, foodId);
    return res.ok(result, 201);
});

/**
 * @swagger
 * /api/v1/foods/progress/today:
 *   get:
 *     summary: Get today's nutrition progress
 *     description: Returns consumed vs target calories and macros, plus logged and remaining meals
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCalories:
 *                       type: number
 *                       example: 2000
 *                     macroProfile:
 *                       type: object
 *                       properties:
 *                         protein:
 *                           type: number
 *                           example: 150
 *                         carb:
 *                           type: number
 *                           example: 200
 *                         fat:
 *                           type: number
 *                           example: 67
 *                     consumed:
 *                       type: object
 *                       properties:
 *                         calories:
 *                           type: number
 *                           example: 650
 *                         protein:
 *                           type: number
 *                           example: 35
 *                         carbs:
 *                           type: number
 *                           example: 80
 *                         fat:
 *                           type: number
 *                           example: 20
 *                     remaining:
 *                       type: object
 *                       properties:
 *                         calories:
 *                           type: number
 *                           example: 1350
 *                         protein:
 *                           type: number
 *                           example: 115
 *                         carbs:
 *                           type: number
 *                           example: 120
 *                         fat:
 *                           type: number
 *                           example: 47
 *                     remainingMeals:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["lunch", "dinner", "snack"]
 *       404:
 *         description: User not found
 */
exports.getTodayProgress = catchAsync(async (req, res, next) => {
    const result = await FoodLogService.getTodayProgress(req.user._id);
    return res.ok(result, 200);
});

/**
 * @swagger
 * /api/v1/foods/logs:
 *   get:
 *     summary: Get all food logs for current user
 *     description: Returns all logged meals for the authenticated user, sorted by date (most recent first)
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Food logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "69338a75026f40a1ce9b5acd"
 *                       user:
 *                         type: string
 *                         example: "692d24c28e5236c6f9ba3aa8"
 *                       food:
 *                         $ref: '#/components/schemas/Food'
 *                       meal:
 *                         type: string
 *                         enum: [breakfast, lunch, dinner, snack]
 *                         example: "lunch"
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2025-12-06"
 *                       servings:
 *                         type: number
 *                         example: 1
 *                       source:
 *                         type: string
 *                         enum: [recommended, non_recommended]
 *                         example: "recommended"
 *                       nutritionSnapshot:
 *                         type: object
 *                         properties:
 *                           calories:
 *                             type: number
 *                             example: 920
 *                           protein:
 *                             type: number
 *                             example: 56
 *                           carbs:
 *                             type: number
 *                             example: 110
 *                           fat:
 *                             type: number
 *                             example: 28
 *                       loggedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-06T01:44:21.412Z"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-06T01:44:21.417Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-06T01:44:21.417Z"
 *             example:
 *               success: true
 *               message: 200
 *               data:
 *                 - _id: "69338a75026f40a1ce9b5acd"
 *                   user: "692d24c28e5236c6f9ba3aa8"
 *                   food:
 *                     _id: "692ebe81e68471451b81aa0e"
 *                     name: "Mì Quảng (Quang Noodles)"
 *                     description: "Turmeric noodles with shrimp, pork, peanuts, and rich broth."
 *                     category: "grains"
 *                     meal: "lunch"
 *                     nutritionalInfo:
 *                       calories: 920
 *                       protein: 56
 *                       carbohydrates: 110
 *                       fat: 28
 *                   meal: "lunch"
 *                   date: "2025-12-06"
 *                   servings: 1
 *                   source: "recommended"
 *                   nutritionSnapshot:
 *                     calories: 920
 *                     protein: 56
 *                     carbs: 110
 *                     fat: 28
 *                   loggedAt: "2025-12-06T01:44:21.412Z"
 *                   createdAt: "2025-12-06T01:44:21.417Z"
 *                   updatedAt: "2025-12-06T01:44:21.417Z"
 *                 - _id: "6933899ead3ca3ce89445d23"
 *                   user: "692d24c28e5236c6f9ba3aa8"
 *                   food:
 *                     _id: "692ebe81e68471451b81a9d0"
 *                     name: "Oatmeal with Banana"
 *                     description: "Warm rolled oats topped with sliced banana and a drizzle of honey."
 *                     category: "grains"
 *                     meal: "breakfast"
 *                     nutritionalInfo:
 *                       calories: 380
 *                       protein: 10
 *                       carbohydrates: 62
 *                       fat: 8
 *                   meal: "breakfast"
 *                   date: "2025-12-06"
 *                   servings: 1
 *                   source: "non_recommended"
 *                   nutritionSnapshot:
 *                     calories: 380
 *                     protein: 10
 *                     carbs: 62
 *                     fat: 8
 *                   loggedAt: "2025-12-06T01:40:46.787Z"
 *                   createdAt: "2025-12-06T01:40:46.791Z"
 *                   updatedAt: "2025-12-06T01:40:46.791Z"
 *       404:
 *         description: User not found
 */
exports.getAllFoodLogs = catchAsync(async (req, res, next) => {
    const result = await FoodLogService.getAllFoodLogs(req.user._id);
    return res.ok(result, 200);
});

/**
 * @swagger
 * /api/v1/foods/logs/{date}:
 *   get:
 *     summary: Get food logs for a specific date
 *     description: Returns all logged meals for the authenticated user on a specific date
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-06"
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Food logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "6933899ead3ca3ce89445d23"
 *                       user:
 *                         type: string
 *                         example: "692d24c28e5236c6f9ba3aa8"
 *                       food:
 *                         $ref: '#/components/schemas/Food'
 *                       meal:
 *                         type: string
 *                         enum: [breakfast, lunch, dinner, snack]
 *                         example: "breakfast"
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2025-12-06"
 *                       servings:
 *                         type: number
 *                         example: 1
 *                       source:
 *                         type: string
 *                         enum: [recommended, non_recommended]
 *                         example: "non_recommended"
 *                       nutritionSnapshot:
 *                         type: object
 *                         properties:
 *                           calories:
 *                             type: number
 *                             example: 380
 *                           protein:
 *                             type: number
 *                             example: 10
 *                           carbs:
 *                             type: number
 *                             example: 62
 *                           fat:
 *                             type: number
 *                             example: 8
 *                       loggedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-06T01:40:46.787Z"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-06T01:40:46.791Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-06T01:40:46.791Z"
 *             example:
 *               success: true
 *               message: 200
 *               data:
 *                 - _id: "6933899ead3ca3ce89445d23"
 *                   user: "692d24c28e5236c6f9ba3aa8"
 *                   food:
 *                     _id: "692ebe81e68471451b81a9d0"
 *                     name: "Oatmeal with Banana"
 *                     description: "Warm rolled oats topped with sliced banana and a drizzle of honey."
 *                     category: "grains"
 *                     meal: "breakfast"
 *                     nutritionalInfo:
 *                       calories: 380
 *                       protein: 10
 *                       carbohydrates: 62
 *                       fat: 8
 *                   meal: "breakfast"
 *                   date: "2025-12-06"
 *                   servings: 1
 *                   source: "non_recommended"
 *                   nutritionSnapshot:
 *                     calories: 380
 *                     protein: 10
 *                     carbs: 62
 *                     fat: 8
 *                   loggedAt: "2025-12-06T01:40:46.787Z"
 *                   createdAt: "2025-12-06T01:40:46.791Z"
 *                   updatedAt: "2025-12-06T01:40:46.791Z"
 *                 - _id: "69338a75026f40a1ce9b5acd"
 *                   user: "692d24c28e5236c6f9ba3aa8"
 *                   food:
 *                     _id: "692ebe81e68471451b81aa0e"
 *                     name: "Mì Quảng (Quang Noodles)"
 *                     description: "Turmeric noodles with shrimp, pork, peanuts, and rich broth."
 *                     category: "grains"
 *                     meal: "lunch"
 *                     nutritionalInfo:
 *                       calories: 920
 *                       protein: 56
 *                       carbohydrates: 110
 *                       fat: 28
 *                   meal: "lunch"
 *                   date: "2025-12-06"
 *                   servings: 1
 *                   source: "recommended"
 *                   nutritionSnapshot:
 *                     calories: 920
 *                     protein: 56
 *                     carbs: 110
 *                     fat: 28
 *                   loggedAt: "2025-12-06T01:44:21.412Z"
 *                   createdAt: "2025-12-06T01:44:21.417Z"
 *                   updatedAt: "2025-12-06T01:44:21.417Z"
 *       404:
 *         description: User not found
 */
exports.getFoodLog = catchAsync(async (req, res, next) => {
    const { date } = req.params;
    const result = await FoodLogService.getFoodLog(req.user._id, date);
    return res.ok(result, 200);
});