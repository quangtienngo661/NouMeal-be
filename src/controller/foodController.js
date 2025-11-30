const FoodService = require("../service/foodService");
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
exports.foodsRecommendation = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const result = await FoodService.foodsRecommendation(userId);
    return res.ok(result, 200);
});

/**
 * @swagger
 * /api/v1/foods/weekly:
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     week:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2025-11-25"
 *                           dayOfWeek:
 *                             type: string
 *                             example: "Monday"
 *                           meals:
 *                             type: object
 *                             properties:
 *                               breakfast:
 *                                 type: array
 *                                 items:
 *                                   $ref: '#/components/schemas/Food'
 *                               lunch:
 *                                 type: array
 *                                 items:
 *                                   $ref: '#/components/schemas/Food'
 *                               dinner:
 *                                 type: array
 *                                 items:
 *                                   $ref: '#/components/schemas/Food'
 *                               snacks:
 *                                 type: array
 *                                 items:
 *                                   $ref: '#/components/schemas/Food'
 *                     nutritionTarget:
 *                       type: object
 *                       properties:
 *                         dailyCalories:
 *                           type: number
 *                           example: 2000
 *                         protein:
 *                           type: number
 *                           example: 150
 *                         carbs:
 *                           type: number
 *                           example: 200
 *                         fat:
 *                           type: number
 *                           example: 67
 *                     cached:
 *                       type: boolean
 *                       example: false
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

    const result = await FoodService.weeklyFoodRecommendation(userId, refresh);
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
 *         description: Food deleted successfully
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