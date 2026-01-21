const FoodService = require("../service/foodService");
const FoodLogService = require("../service/foodLogService");
const { catchAsync } = require("../libs/util/catchAsync")

// 📦 READ operations
/**
 * @swagger
 * /api/v1/foods:
 *   get:
 *     summary: Get all foods
 *     description: Retrieve a list of all active foods with pagination support.
 *     tags: [Foods - User]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Filter by food categories (comma-separated)
 *         example: protein,vegetables
 *       - in: query
 *         name: meal
 *         schema:
 *           type: string
 *           enum: [breakfast, lunch, dinner, snack]
 *         description: Filter by meal type
 *         example: lunch
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *         example: 10
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
    const { categories, meal, tags, page, limit } = req.query;
    const { result, meta } = await FoodService.getFoods(categories, meal, tags, page, limit);
    return res.ok(result, 200, "Success", meta);
});

/**
 * @swagger
 * /api/v1/foods/today-meals:
 *   get:
 *     summary: Get today's meal recommendations for current user
 *     description: Returns today's recommended meals (breakfast, lunch, dinner, snacks) based on the authenticated user's profile from the weekly plan. Can also be used with a foodId in query to get adaptive recommendations when user selects a non-recommended food.
 *     tags: [Foods - User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: foodId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional food ID to get adaptive meal recommendations
 *         example: "692ebe81e68471451b81a9d0"
 *     responses:
 *       200:
 *         description: Today's meals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2026-01-10"
 *                     dayName:
 *                       type: string
 *                       example: "Friday"
 *                     meals:
 *                       type: object
 *                       properties:
 *                         breakfast:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/FoodWithDiff'
 *                         lunch:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/FoodWithDiff'
 *                         dinner:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/FoodWithDiff'
 *                         snack:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Food'
 *             example:
 *               success: true
 *               message: "Success"
 *               data:
 *                 date: "2026-01-10"
 *                 dayName: "Friday"
 *                 meals:
 *                   breakfast:
 *                     - _id: "692ebe81e68471451b81aa09"
 *                       name: "Bánh Mì Thịt (Vietnamese Sandwich)"
 *                       description: "Crispy baguette with grilled pork, pâté, pickled vegetables, and cilantro."
 *                       category: "grains"
 *                       meal: "breakfast"
 *                       nutritionalInfo:
 *                         calories: 720
 *                         protein: 38
 *                         carbohydrates: 78
 *                         fat: 26
 *                       calorieDiff: 6.375
 *                       proteinDiff: 15.4
 *                       carbDiff: 6.6
 *                       fatDiff: 2.3
 *                       totalDiff: 56.175
 *                   lunch:
 *                     - _id: "692ebe81e68471451b81aa0e"
 *                       name: "Mì Quảng (Quang Noodles)"
 *                       category: "grains"
 *                       meal: "lunch"
 *                       nutritionalInfo:
 *                         calories: 920
 *                         protein: 56
 *                         carbohydrates: 110
 *                         fat: 28
 *                   dinner:
 *                     - _id: "692ebe81e68471451b81aa0f"
 *                       name: "Cá Kho Tộ (Caramelized Fish in Clay Pot)"
 *                       category: "protein"
 *                       meal: "dinner"
 *                       nutritionalInfo:
 *                         calories: 720
 *                         protein: 48
 *                         carbohydrates: 82
 *                         fat: 20
 *                   snack:
 *                     - _id: "692ebe81e68471451b81a9d2"
 *                       name: "Greek Yogurt"
 *                       category: "dairy"
 *                       meal: "snack"
 *                       nutritionalInfo:
 *                         calories: 190
 *                         protein: 19
 *                         carbohydrates: 14
 *                         fat: 4
 *       400:
 *         description: Bad request or already chose non-recommended meal today
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User or food not found
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
exports.getTodayMeals = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const foodId = req.query.foodId || null;

    const result = await FoodService.getTodayMeals(userId, foodId);
    return res.ok(result, 200, "Success");
});

/**
 * @swagger
 * /api/v1/foods/reset-today-meals:
 *   post:
 *     summary: Reset today's meal recommendations
 *     description: Clears the cached non-recommended meal selection for today and returns fresh today meal recommendations for the authenticated user.
 *     tags: [Foods - User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today meals reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Today meals reset successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2025-12-06"
 *                     dayName:
 *                       type: string
 *                       example: "Friday"
 *                     meals:
 *                       type: object
 *                       properties:
 *                         breakfast:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/FoodWithDiff'
 *                         lunch:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/FoodWithDiff'
 *                         dinner:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/FoodWithDiff'
 *                         snack:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/FoodWithDiff'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
exports.resetTodayMeals = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const result = await FoodService.resetTodayMeals(userId);
    return res.ok(result, 200, "Today meals reset successfully");
});

/**
 * @swagger
 * /api/v1/foods/weekly-recommended:
 *   get:
 *     summary: Get weekly food recommendations for current user
 *     description: Returns 7 days of recommended foods (breakfast, lunch, dinner, snacks) based on the authenticated user's profile with diversity across days.
 *     tags: [Foods - User]
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
 *     tags: [Foods - User]
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

/**
 * @swagger
 * /api/v1/foods/user:
 *   get:
 *     summary: Get foods created by current user
 *     description: Retrieve all foods posted by the authenticated user with pagination support.
 *     tags: [Foods - User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *         example: 10
 *     responses:
 *       200:
 *         description: User foods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodListResponse'
 *       401:
 *         description: Unauthorized
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
exports.getOwnFoods = catchAsync(async (req, res, next) => {
    const { page, limit } = req.query;
    const userId = req.user._id;

    console.log("userId:", userId);

    const { result, meta } = await FoodService.getFoodsByUserId(userId, page, limit);
    return res.ok(result, 200, "Success", meta);
});

/**
 * @swagger
 * /api/v1/foods/admin:
 *   get:
 *     summary: Get foods created by admin
 *     description: Retrieve all foods posted by admin (foods without postedBy field) with pagination support. Admin only access.
 *     tags: [Foods - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Admin foods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodListResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin only
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
exports.getAdminFoods = catchAsync(async (req, res, next) => {
    const { page, limit } = req.query;

    const { result, meta } = await FoodService.getAdminFoods(page, limit);
    return res.ok(result, 200, "Success", meta);
});

/**
 * @swagger
 * /api/v1/foods/user/{userId}:
 *   get:
 *     summary: Get foods created by other user
 *     description: Retrieve all foods posted by the specified user with pagination support.
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose foods to retrieve
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *         example: 10
 *     responses:
 *       200:
 *         description: User foods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodListResponse'
 *       401:
 *         description: Unauthorized
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
exports.getFoodsByUserId = catchAsync(async (req, res, next) => {
    const { page, limit } = req.query;
    const userId = req.params.userId;

    const { result, meta } = await FoodService.getFoodsByUserId(userId, page, limit);
    return res.ok(result, 200, "Success", meta);
});

// ✏️ CREATE / UPDATE / DELETE
/**
 * @swagger
 * /api/v1/foods/admin:
 *   post:
 *     summary: Create a new food by admin
 *     description: Add a new food item to the database by admin (without postedBy field). Image should be sent as base64 string.
 *     tags: [Foods - Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - meal
 *               - nutritionalInfo
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Grilled Salmon with Vegetables"
 *               description:
 *                 type: string
 *                 example: "Fresh Atlantic salmon grilled with olive oil, served with steamed broccoli"
 *               instructions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - step
 *                     - description
 *                   properties:
 *                     step:
 *                       type: number
 *                       minimum: 1
 *                       example: 1
 *                     description:
 *                       type: string
 *                       example: "Season salmon with salt and pepper"
 *                 example: [{"step": 1, "description": "Season salmon with salt and pepper"}, {"step": 2, "description": "Grill for 4-5 minutes per side"}]
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Salmon fillet"
 *                     amount:
 *                       type: string
 *                       example: "200g"
 *                 example: [{"name": "Salmon fillet", "amount": "200g"}, {"name": "Broccoli", "amount": "100g"}]
 *               category:
 *                 type: string
 *                 enum: [fruits, vegetables, grains, protein, dairy, fats, beverages, snacks, desserts, spices]
 *                 example: "protein"
 *               meal:
 *                 type: string
 *                 enum: [breakfast, lunch, dinner, snack]
 *                 example: "lunch"
 *               nutritionalInfo:
 *                 type: object
 *                 required:
 *                   - calories
 *                   - protein
 *                   - carbohydrates
 *                   - fat
 *                 properties:
 *                   calories:
 *                     type: number
 *                     example: 450
 *                   protein:
 *                     type: number
 *                     example: 42
 *                   carbohydrates:
 *                     type: number
 *                     example: 18
 *                   fat:
 *                     type: number
 *                     example: 22
 *                   fiber:
 *                     type: number
 *                     example: 3
 *                   sugar:
 *                     type: number
 *                     example: 2
 *                   sodium:
 *                     type: number
 *                     example: 420
 *                   cholesterol:
 *                     type: number
 *                     example: 75
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["high_protein", "low_carb", "heart_healthy"]
 *               allergens:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [peanuts, tree_nuts, milk, eggs, wheat_gluten, fish, shellfish, soy, corn, sesame, pineapple, strawberry, banana, tomato, apple, chocolate, honey, mustard, other]
 *                 example: ["fish"]
 *               image:
 *                 type: string
 *                 description: Base64 encoded image string (with or without data URI prefix)
 *                 example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
 *     responses:
 *       201:
 *         description: Food created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "64f1f77bcf86cd7994390123"
 *                     name:
 *                       type: string
 *                       example: "Grilled Salmon with Vegetables"
 *                     description:
 *                       type: string
 *                       example: "Fresh Atlantic salmon grilled with olive oil, served with steamed broccoli"
 *                     instructions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           step:
 *                             type: number
 *                             example: 1
 *                           description:
 *                             type: string
 *                             example: "Season salmon with salt and pepper"
 *                           _id:
 *                             type: string
 *                             example: "6968aad8c8c36a312277419a"
 *                       example: [{"step": 1, "description": "Season salmon with salt and pepper", "_id": "6968aad8c8c36a312277419a"}, {"step": 2, "description": "Grill for 4-5 minutes per side", "_id": "6968aad8c8c36a312277419b"}]
 *                     imageUrl:
 *                       type: string
 *                       example: "https://res.cloudinary.com/xxx/mealgenie/foods/abc123.jpg"
 *                     category:
 *                       type: string
 *                       enum: [fruits, vegetables, grains, protein, dairy, fats, beverages, snacks, desserts, spices]
 *                       example: "protein"
 *                     meal:
 *                       type: string
 *                       enum: [breakfast, lunch, dinner, snack]
 *                       example: "lunch"
 *                     ingredients:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Salmon fillet"
 *                           amount:
 *                             type: string
 *                             example: "200g"
 *                           _id:
 *                             type: string
 *                             example: "6968aad8c8c36a312277419d"
 *                       example: [{"name": "Salmon fillet", "amount": "200g", "_id": "6968aad8c8c36a312277419d"}, {"name": "Broccoli", "amount": "100g", "_id": "6968aad8c8c36a312277419e"}]
 *                     nutritionalInfo:
 *                       type: object
 *                       properties:
 *                         calories:
 *                           type: number
 *                           example: 450
 *                         protein:
 *                           type: number
 *                           example: 42
 *                         carbohydrates:
 *                           type: number
 *                           example: 18
 *                         fat:
 *                           type: number
 *                           example: 22
 *                         fiber:
 *                           type: number
 *                           example: 3
 *                         sugar:
 *                           type: number
 *                           example: 2
 *                         sodium:
 *                           type: number
 *                           example: 420
 *                         cholesterol:
 *                           type: number
 *                           example: 75
 *                     allergens:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["fish"]
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["high_protein", "low_carb", "heart_healthy"]
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     isPublic:
 *                       type: boolean
 *                       example: true
 *                       description: Admin-created foods are public by default
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-10-07T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-10-07T10:30:00.000Z"
 *       400:
 *         description: Validation error or invalid base64 format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin only
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
exports.createFoodByAdmin = catchAsync(async (req, res, next) => {
    const { image, ...foodInfo } = req.body;

    const result = await FoodService.createFoodByAdmin(foodInfo, image);
    return res.ok(result, 201);
});

/**
 * @swagger
 * /api/v1/foods/user:
 *   post:
 *     summary: Create a new food by user
 *     description: Add a new food item to the database by authenticated user (with postedBy field, isPublic=false by default). Image is REQUIRED and should be sent as base64 string. Admin approval required before food appears in recommendations.
 *     tags: [Foods - User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - meal
 *               - nutritionalInfo
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *                 example: "My Protein Smoothie Bowl"
 *               description:
 *                 type: string
 *                 example: "Homemade smoothie bowl with banana and Greek yogurt"
 *               instructions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - step
 *                     - description
 *                   properties:
 *                     step:
 *                       type: number
 *                       minimum: 1
 *                       example: 1
 *                     description:
 *                       type: string
 *                       example: "Blend banana with Greek yogurt"
 *                 example: [{"step": 1, "description": "Blend banana with Greek yogurt"}, {"step": 2, "description": "Pour into bowl and top with granola"}]
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Greek Yogurt"
 *                     amount:
 *                       type: string
 *                       example: "200g"
 *                 example: [{"name": "Greek Yogurt", "amount": "200g"}, {"name": "Banana", "amount": "1 medium"}]
 *               category:
 *                 type: string
 *                 enum: [fruits, vegetables, grains, protein, dairy, fats, beverages, snacks, desserts, spices]
 *                 example: "dairy"
 *               meal:
 *                 type: string
 *                 enum: [breakfast, lunch, dinner, snack]
 *                 example: "breakfast"
 *               nutritionalInfo:
 *                 type: object
 *                 required:
 *                   - calories
 *                   - protein
 *                   - carbohydrates
 *                   - fat
 *                 properties:
 *                   calories:
 *                     type: number
 *                     example: 380
 *                   protein:
 *                     type: number
 *                     example: 28
 *                   carbohydrates:
 *                     type: number
 *                     example: 45
 *                   fat:
 *                     type: number
 *                     example: 10
 *                   fiber:
 *                     type: number
 *                     example: 3
 *                   sugar:
 *                     type: number
 *                     example: 18
 *                   sodium:
 *                     type: number
 *                     example: 80
 *                   cholesterol:
 *                     type: number
 *                     example: 15
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["high_protein", "balanced"]
 *               allergens:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [peanuts, tree_nuts, milk, eggs, wheat_gluten, fish, shellfish, soy, corn, sesame, pineapple, strawberry, banana, tomato, apple, chocolate, honey, mustard, other]
 *                 example: ["dairy"]
 *               image:
 *                 type: string
 *                 description: Base64 encoded image string (REQUIRED - with or without data URI prefix)
 *                 example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
 *     responses:
 *       201:
 *         description: Food created successfully (pending admin approval)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "6933899ead3ca3ce89445d23"
 *                     name:
 *                       type: string
 *                       example: "My Protein Smoothie Bowl"
 *                     description:
 *                       type: string
 *                       example: "Homemade smoothie bowl with banana and Greek yogurt"
 *                     postedBy:
 *                       type: string
 *                       example: "692d24c28e5236c6f9ba3aa8"
 *                       description: User ID who created this food
 *                     instructions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           step:
 *                             type: number
 *                             example: 1
 *                           description:
 *                             type: string
 *                             example: "Blend banana with Greek yogurt"
 *                           _id:
 *                             type: string
 *                             example: "6968aad8c8c36a312277419a"
 *                       example: [{"step": 1, "description": "Blend banana with Greek yogurt", "_id": "6968aad8c8c36a312277419a"}, {"step": 2, "description": "Pour into bowl and top with granola", "_id": "6968aad8c8c36a312277419b"}]
 *                     imageUrl:
 *                       type: string
 *                       example: "https://res.cloudinary.com/xxx/mealgenie/foods/abc123.jpg"
 *                     category:
 *                       type: string
 *                       enum: [fruits, vegetables, grains, protein, dairy, fats, beverages, snacks, desserts, spices]
 *                       example: "dairy"
 *                     meal:
 *                       type: string
 *                       enum: [breakfast, lunch, dinner, snack]
 *                       example: "breakfast"
 *                     ingredients:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Greek Yogurt"
 *                           amount:
 *                             type: string
 *                             example: "200g"
 *                           _id:
 *                             type: string
 *                             example: "6968aad8c8c36a312277419d"
 *                       example: [{"name": "Greek Yogurt", "amount": "200g", "_id": "6968aad8c8c36a312277419d"}, {"name": "Banana", "amount": "1 medium", "_id": "6968aad8c8c36a312277419e"}]
 *                     nutritionalInfo:
 *                       type: object
 *                       properties:
 *                         calories:
 *                           type: number
 *                           example: 380
 *                         protein:
 *                           type: number
 *                           example: 28
 *                         carbohydrates:
 *                           type: number
 *                           example: 45
 *                         fat:
 *                           type: number
 *                           example: 10
 *                         fiber:
 *                           type: number
 *                           example: 3
 *                         sugar:
 *                           type: number
 *                           example: 18
 *                         sodium:
 *                           type: number
 *                           example: 80
 *                         cholesterol:
 *                           type: number
 *                           example: 15
 *                     allergens:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["dairy"]
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["high_protein", "balanced"]
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     isPublic:
 *                       type: boolean
 *                       example: false
 *                       description: User-created foods are private by default until admin approval
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-10-07T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-10-07T10:30:00.000Z"
 *       400:
 *         description: Validation error, missing required image, or invalid base64 format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error (including Cloudinary upload failure)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.createFoodByUser = catchAsync(async (req, res, next) => {
    const { image, ...foodInfo } = req.body;

    const result = await FoodService.createFoodByUser(foodInfo, image, req.user._id);
    return res.ok(result, 201);
});

/**
 * @swagger
 * /api/v1/foods/{foodId}:
 *   patch:
 *     summary: Update a food (admin/user)
 *     description: Update fields of an existing food item by ID.
 *     tags: [Foods - User]
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
    const { foodInfo, image } = { ...req.body };

    const result = await FoodService.updateFood(foodId, image, foodInfo, req.user._id);
    return res.ok(result, 200);
});

/**
 * @swagger
 * /api/v1/foods/admin/{foodId}:
 *   delete:
 *     summary: Delete a food by admin
 *     description: Admin can delete any food item by ID.
 *     tags: [Foods - Admin]
 *     security:
 *       - bearerAuth: []
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Food deleted successfully
 *                 data:
 *                   $ref: '#/components/schemas/Food'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
exports.deleteFoodByAdmin = catchAsync(async (req, res, next) => {
    const { foodId } = req.params;

    const result = await FoodService.deleteFoodByAdmin(foodId);
    return res.ok(result, 200, "Food deleted successfully");
});

/**
 * @swagger
 * /api/v1/foods/user/{foodId}:
 *   delete:
 *     summary: Delete a food by user
 *     description: User can only delete foods they created (validates postedBy field).
 *     tags: [Foods - User]
 *     security:
 *       - bearerAuth: []
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Food deleted successfully
 *                 data:
 *                   $ref: '#/components/schemas/Food'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - You can only delete your own foods
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
exports.deleteFoodByUser = catchAsync(async (req, res, next) => {
    const { foodId } = req.params;
    const userId = req.user._id;

    const result = await FoodService.deleteFoodByUser(foodId, userId);
    return res.ok(result, 200, "Food deleted successfully");
});

/**
 * @swagger
 * /api/v1/foods/cache/clear:
 *   delete:
 *     summary: Clear all recommendation caches
 *     description: Clear all weekly recommendation caches for current user
 *     tags: [Foods - User]
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

/**
 * @swagger
 * /api/v1/foods/admin/{foodId}/recommendable:
 *   patch:
 *     summary: Update food recommendable status
 *     description: Update the isRecommendable status of a food item. Only accessible by admin.
 *     tags: [Foods - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the food to update
 *         example: "692ebe81e68471451b81aa09"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isRecommendable
 *             properties:
 *               isRecommendable:
 *                 type: boolean
 *                 description: Whether the food can be recommended to users
 *                 example: true
 *     responses:
 *       200:
 *         description: Food recommendable status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Food recommendable status updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Food'
 *       400:
 *         description: Bad request - Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
exports.updateRecommendableStatus = catchAsync(async (req, res, next) => {
    const { foodId } = req.params;
    const { isRecommendable } = req.body;

    const updatedFood = await FoodService.updateRecommendableStatus(foodId, isRecommendable);
    return res.ok(updatedFood, 200, "Food recommendable status updated successfully");
});

/**
 * @swagger
 * /api/v1/foods/admin/public:
 *   get:
 *     summary: Get all public non-recommendable foods
 *     description: Retrieve all foods that are marked as public (isPublic = true) and not recommendable (isRecommendable = false). Only accessible by admin.
 *     tags: [Foods - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Public non-recommendable foods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Public foods retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Food'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     totalItems:
 *                       type: integer
 *                       example: 48
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not an admin
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
exports.getPublicFoods = catchAsync(async (req, res, next) => {
    const { page, limit } = req.query;
    const { result, meta } = await FoodService.getPublicFoods(page, limit);
    return res.ok(result, 200, "Public foods retrieved successfully", meta);
});

/**
 * @swagger
 * /api/v1/foods/admin/non-recommendable:
 *   get:
 *     summary: Get all non-recommendable foods
 *     description: Retrieve all foods that are not recommendable (isRecommendable = false). Only accessible by admin.
 *     tags: [Foods - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Non-recommendable foods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Non-recommendable foods retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Food'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 *                     totalItems:
 *                       type: integer
 *                       example: 95
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not an admin
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
exports.getNonRecommendableFoods = catchAsync(async (req, res, next) => {
    const { page, limit } = req.query;
    const { result, meta } = await FoodService.getNonRecommendableFoods(page, limit);
    return res.ok(result, 200, "Non-recommendable foods retrieved successfully", meta);
});

// 📝 FOOD LOGGING
/**
 * @swagger
 * /api/v1/foods/log:
 *   post:
 *     summary: Log a consumed meal
 *     description: Log any food (from recommendations or user-posted) as consumed for tracking daily nutrition
 *     tags: [Food Logs]
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
 *     tags: [Food Logs]
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
 *     tags: [Food Logs]
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
 *     tags: [Food Logs]
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

/**
 * @swagger
 * /api/v1/foods/check-appropriate:
 *   post:
 *     summary: Check if a food is appropriate for user's preferences
 *     description: |
 *       Checks whether a food object matches any of the authenticated user's dietary preferences based on food tags.
 *       Returns false if user has no preferences or food has no tags.
 *       This endpoint is useful to check appropriateness before creating a new food.
 *     tags: [Foods - User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - meal
 *               - nutritionalInfo
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the food
 *                 example: "Grilled Chicken Salad"
 *               description:
 *                 type: string
 *                 description: Description of the food
 *                 example: "Healthy grilled chicken with mixed greens"
 *               category:
 *                 type: string
 *                 enum: [protein, vegetables, fruits, grains, dairy]
 *                 description: Food category
 *                 example: "protein"
 *               meal:
 *                 type: string
 *                 enum: [breakfast, lunch, dinner, snack]
 *                 description: Meal type
 *                 example: "lunch"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tags for food preferences (vegetarian, vegan, gluten-free, etc.)
 *                 example: ["high-protein", "low-carb", "gluten-free"]
 *               allergens:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of allergens in the food
 *                 example: []
 *               nutritionalInfo:
 *                 type: object
 *                 required:
 *                   - calories
 *                   - protein
 *                   - carbohydrates
 *                   - fat
 *                 properties:
 *                   calories:
 *                     type: number
 *                     description: Calories in kcal
 *                     example: 350
 *                   protein:
 *                     type: number
 *                     description: Protein in grams
 *                     example: 40
 *                   carbohydrates:
 *                     type: number
 *                     description: Carbohydrates in grams
 *                     example: 15
 *                   fat:
 *                     type: number
 *                     description: Fat in grams
 *                     example: 12
 *     responses:
 *       200:
 *         description: Food appropriateness check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     result:
 *                       type: object
 *                       properties:
 *                         isAppropriate:
 *                           type: boolean
 *                           description: Whether the food tags match user's dietary goal preferences. False if user has no goal preferences or food has no tags.
 *                           example: true
 *                         isAllergyFree:
 *                           type: boolean
 *                           description: Whether the food is free from user's allergens. True if food has no allergens that user is allergic to.
 *                           example: true
 *                     userId:
 *                       type: string
 *                       example: "67562c8b5e4f123456789abc"
 *             examples:
 *               appropriate_and_safe:
 *                 summary: Food matches user preferences and is allergy-free
 *                 value:
 *                   success: true
 *                   message: "Success"
 *                   data:
 *                     result:
 *                       isAppropriate: true
 *                       isAllergyFree: true
 *                     userId: "67562c8b5e4f123456789abc"
 *               appropriate_but_allergen:
 *                 summary: Food matches preferences but contains allergen
 *                 value:
 *                   success: true
 *                   message: "Success"
 *                   data:
 *                     result:
 *                       isAppropriate: true
 *                       isAllergyFree: false
 *                     userId: "67562c8b5e4f123456789abc"
 *               not_appropriate_but_safe:
 *                 summary: Food doesn't match preferences but is allergy-free
 *                 value:
 *                   success: true
 *                   message: "Success"
 *                   data:
 *                     result:
 *                       isAppropriate: false
 *                       isAllergyFree: true
 *                     userId: "67562c8b5e4f123456789abc"
 *               not_appropriate_and_allergen:
 *                 summary: Food doesn't match preferences and contains allergen
 *                 value:
 *                   success: true
 *                   message: "Success"
 *                   data:
 *                     result:
 *                       isAppropriate: false
 *                       isAllergyFree: false
 *                     userId: "67562c8b5e4f123456789abc"
 *       400:
 *         description: Bad request - Invalid food data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
exports.checkFoodAppropriate = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const foodInfo = req.body;

    // Check if food is appropriate for user's preferences
    const result = await FoodService.isAppropriate(userId, foodInfo);

    return res.ok({
        result,
        userId
    }, 200, "Success");
});

/**
 * @swagger
 * /api/v1/foods/logs/reset:
 *   delete:
 *     summary: Reset today's food logs
 *     description: Delete all food logs for the current day for the authenticated user. This will clear all logged meals for today.
 *     tags: [Food Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's food logs reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Today's meals have been reset."
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Today's food logs have been reset."
 *             example:
 *               success: true
 *               message: "Success"
 *               data:
 *                 message: "Today's food logs have been reset."
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
exports.resetTodayLogs = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const result = await FoodLogService.resetTodayLogs(userId);
    return res.ok(result, 200, "Success");
});