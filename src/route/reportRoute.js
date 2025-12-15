const express = require('express');
const router = express.Router();
const reportCtrl = require('../controller/reportController');

// middlewares assumed to exist in project
const { authenticate, restrictTo } = require('../middleware/authMiddleware');

// ADMIN endpoints (secure)
/**
 * @swagger
 * /api/v1/reports/admin/overview:
 *   get:
 *     tags: [Reports]
 *     summary: Admin dashboard overview
 *     description: Returns total users, new users timeseries, active users summary and unverified count.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering data (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering data (ISO format)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Group results by day, week, or month
 *       - in: query
 *         name: tz
 *         schema:
 *           type: string
 *         description: Timezone for date calculations (e.g., UTC, America/New_York)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview data retrieved successfully
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
 *                     totalUsers:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                           example: 1500
 *                           description: Total number of registered users
 *                     newUsersSeries:
 *                       type: array
 *                       description: Time series of new user registrations
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-12-01T00:00:00.000Z"
 *                           count:
 *                             type: integer
 *                             example: 25
 *                             description: Number of new users registered on this date
 *                     activeSummary:
 *                       type: object
 *                       description: Summary of active users
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 1500
 *                           description: Total number of users
 *                         active:
 *                           type: integer
 *                           example: 1200
 *                           description: Number of active users
 *                         activePercent:
 *                           type: number
 *                           format: float
 *                           example: 80.0
 *                           description: Percentage of active users
 *                     unverified:
 *                       type: object
 *                       properties:
 *                         unverified:
 *                           type: integer
 *                           example: 50
 *                           description: Count of users with unverified emails
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Access denied
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/admin/overview', authenticate, restrictTo('admin'), reportCtrl.adminOverview);

/**
 * @swagger
 * /api/v1/reports/admin/demographics:
 *   get:
 *     tags: [Reports]
 *     summary: Admin demographics
 *     description: Returns gender distribution, age buckets, average height/weight by gender and goal distribution.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Demographics data retrieved successfully
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
 *                     gender:
 *                       type: object
 *                       description: Gender distribution statistics
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 1500
 *                         breakdown:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               gender:
 *                                 type: string
 *                                 example: male
 *                               count:
 *                                 type: integer
 *                                 example: 800
 *                               percent:
 *                                 type: number
 *                                 format: float
 *                                 example: 53.33
 *                     age:
 *                       type: object
 *                       description: Age distribution by buckets
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 1500
 *                         breakdown:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               bucket:
 *                                 type: string
 *                                 example: "25-35"
 *                               count:
 *                                 type: integer
 *                                 example: 450
 *                               percent:
 *                                 type: number
 *                                 format: float
 *                                 example: 30.0
 *                     avgHeightWeightByGender:
 *                       type: array
 *                       description: Average height and weight grouped by gender
 *                       items:
 *                         type: object
 *                         properties:
 *                           gender:
 *                             type: string
 *                             example: male
 *                           avgHeight:
 *                             type: number
 *                             format: float
 *                             example: 175.5
 *                             description: Average height in cm
 *                           avgWeight:
 *                             type: number
 *                             format: float
 *                             example: 78.2
 *                             description: Average weight in kg
 *                           count:
 *                             type: integer
 *                             example: 800
 *                     goals:
 *                       type: object
 *                       description: Distribution of user goals
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 1500
 *                         breakdown:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               goal:
 *                                 type: string
 *                                 example: lose_weight
 *                               count:
 *                                 type: integer
 *                                 example: 600
 *                               percent:
 *                                 type: number
 *                                 format: float
 *                                 example: 40.0
 *                     activities:
 *                       type: object
 *                       description: Distribution of activity levels
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 1500
 *                         breakdown:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               activity:
 *                                 type: string
 *                                 example: moderately_active
 *                               count:
 *                                 type: integer
 *                                 example: 500
 *                               percent:
 *                                 type: number
 *                                 format: float
 *                                 example: 33.33
 *                     allergies:
 *                       type: object
 *                       description: Distribution of user allergies
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 300
 *                         breakdown:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               allergy:
 *                                 type: string
 *                                 example: gluten
 *                               count:
 *                                 type: integer
 *                                 example: 120
 *                               percent:
 *                                 type: number
 *                                 format: float
 *                                 example: 40.0
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Access denied
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/admin/demographics', authenticate, restrictTo('admin'), reportCtrl.adminDemographics);

/**
 * @swagger
 * /api/v1/reports/admin/food-overview:
 *   get:
 *     tags: [Reports]
 *     summary: Admin food statistics overview
 *     description: Returns total foods count, foods by category, foods by meal type, and new foods added per month.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Food overview data retrieved successfully
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
 *                     total:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 500
 *                           description: Total number of foods in the system
 *                     byCategory:
 *                       type: array
 *                       description: Foods grouped by category
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                             example: protein
 *                           count:
 *                             type: integer
 *                             example: 150
 *                     byMeal:
 *                       type: array
 *                       description: Foods grouped by meal type
 *                       items:
 *                         type: object
 *                         properties:
 *                           meal:
 *                             type: string
 *                             example: breakfast
 *                           count:
 *                             type: integer
 *                             example: 120
 *                     newPerMonth:
 *                       type: array
 *                       description: New foods added per month
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-11-01T00:00:00.000Z"
 *                           count:
 *                             type: integer
 *                             example: 15
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Access denied
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/admin/food-overview', authenticate, restrictTo('admin'), reportCtrl.adminFoodOverview);

/**
 * @swagger
 * /api/v1/reports/admin/top-foods:
 *   get:
 *     tags: [Reports]
 *     summary: Top and extreme foods
 *     description: Returns highest/lowest calorie foods and foods with most allergens.
 *     parameters:
 *       - in: query
 *         name: top
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top items to return
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top foods data retrieved successfully
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
 *                     highest:
 *                       type: array
 *                       description: Foods with highest calories
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439011"
 *                           name:
 *                             type: string
 *                             example: "Chocolate Cake"
 *                           calories:
 *                             type: number
 *                             example: 450
 *                           allergens:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["gluten", "dairy"]
 *                     lowest:
 *                       type: array
 *                       description: Foods with lowest calories
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439012"
 *                           name:
 *                             type: string
 *                             example: "Cucumber"
 *                           calories:
 *                             type: number
 *                             example: 16
 *                           allergens:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: []
 *                     allergens:
 *                       type: array
 *                       description: Foods with most allergens
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439013"
 *                           name:
 *                             type: string
 *                             example: "Pizza"
 *                           allergensCount:
 *                             type: integer
 *                             example: 5
 *                           allergens:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["gluten", "dairy", "soy", "egg", "nuts"]
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Access denied
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/admin/top-foods', authenticate, restrictTo('admin'), reportCtrl.adminTopFoods);

// USER endpoints (authenticated)
/**
 * @swagger
 * /api/v1/reports/user/summary:
 *   get:
 *     tags: [Reports]
 *     summary: User dashboard summary for today
 *     description: Returns today's calorie and macro totals, calories by meal, recent logged foods, and recommended daily calories for the authenticated user.
 *     parameters:
 *       - in: query
 *         name: tz
 *         schema:
 *           type: string
 *           default: UTC
 *         description: Timezone for date calculations (e.g., UTC, America/New_York)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User dashboard summary retrieved successfully
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
 *                     totals:
 *                       type: object
 *                       description: Today's total calories and macros
 *                       properties:
 *                         calories:
 *                           type: number
 *                           example: 1800
 *                         protein:
 *                           type: number
 *                           example: 120
 *                           description: Total protein in grams
 *                         carb:
 *                           type: number
 *                           example: 200
 *                           description: Total carbohydrates in grams
 *                         fat:
 *                           type: number
 *                           example: 60
 *                           description: Total fat in grams
 *                     byMeal:
 *                       type: array
 *                       description: Calories breakdown by meal type
 *                       items:
 *                         type: object
 *                         properties:
 *                           mealType:
 *                             type: string
 *                             example: breakfast
 *                           calories:
 *                             type: number
 *                             example: 450
 *                     recent:
 *                       type: array
 *                       description: Recently logged foods
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439011"
 *                           eatenAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-12-15T08:30:00.000Z"
 *                           mealType:
 *                             type: string
 *                             example: breakfast
 *                           servingSize:
 *                             type: number
 *                             example: 1.5
 *                           calories:
 *                             type: number
 *                             example: 350
 *                           protein:
 *                             type: number
 *                             example: 25
 *                           carb:
 *                             type: number
 *                             example: 40
 *                           fat:
 *                             type: number
 *                             example: 12
 *                           food:
 *                             type: object
 *                             description: Food details
 *                     recommended:
 *                       type: number
 *                       example: 2200
 *                       description: Estimated recommended daily calories based on user profile
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/user/summary', authenticate, reportCtrl.userDashboardToday);

/**
 * @swagger
 * /api/v1/reports/user/timeseries:
 *   get:
 *     tags: [Reports]
 *     summary: User timeseries calories/macros
 *     description: Returns aggregated calories and macros for the authenticated user over a specified date range.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering data (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering data (ISO format)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Group results by day, week, or month
 *       - in: query
 *         name: tz
 *         schema:
 *           type: string
 *         description: Timezone for date calculations (e.g., UTC, America/New_York)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Time series data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   description: Time series of calories and macros
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-14T00:00:00.000Z"
 *                       calories:
 *                         type: number
 *                         example: 2100
 *                       protein:
 *                         type: number
 *                         example: 130
 *                         description: Protein in grams
 *                       carb:
 *                         type: number
 *                         example: 220
 *                         description: Carbohydrates in grams
 *                       fat:
 *                         type: number
 *                         example: 70
 *                         description: Fat in grams
 *                       pct:
 *                         type: object
 *                         description: Percentage breakdown of macros by calories
 *                         properties:
 *                           protein:
 *                             type: number
 *                             format: float
 *                             example: 24.8
 *                             description: Percentage of calories from protein
 *                           carbs:
 *                             type: number
 *                             format: float
 *                             example: 41.9
 *                             description: Percentage of calories from carbs
 *                           fat:
 *                             type: number
 *                             format: float
 *                             example: 30.0
 *                             description: Percentage of calories from fat
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/user/timeseries', authenticate, reportCtrl.userTimeSeries);

/**
 * @swagger
 * /api/v1/reports/user/per-meal:
 *   get:
 *     tags: [Reports]
 *     summary: User per-meal analysis
 *     description: Returns calorie and macro analysis grouped by meal type for the authenticated user.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering data (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering data (ISO format)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Per-meal analysis data retrieved successfully
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
 *                   description: Analysis of calories and macros per meal type
 *                   properties:
 *                     perMeal:
 *                       type: array
 *                       description: Analysis breakdown per meal type
 *                       items:
 *                         type: object
 *                         properties:
 *                           mealType:
 *                             type: string
 *                             example: breakfast
 *                           avgCalories:
 *                             type: number
 *                             format: float
 *                             example: 450.5
 *                           avgProtein:
 *                             type: number
 *                             format: float
 *                             example: 28.3
 *                           count:
 *                             type: integer
 *                             example: 30
 *                             description: Number of logs for this meal type
 *                     highestCalories:
 *                       type: object
 *                       description: Meal type with highest average calories
 *                       properties:
 *                         mealType:
 *                           type: string
 *                           example: dinner
 *                         avgCalories:
 *                           type: number
 *                           format: float
 *                           example: 650.2
 *                         avgProtein:
 *                           type: number
 *                           format: float
 *                           example: 45.1
 *                         count:
 *                           type: integer
 *                           example: 28
 *                     lowestProtein:
 *                       type: object
 *                       description: Meal type with lowest average protein
 *                       properties:
 *                         mealType:
 *                           type: string
 *                           example: snack
 *                         avgCalories:
 *                           type: number
 *                           format: float
 *                           example: 180.5
 *                         avgProtein:
 *                           type: number
 *                           format: float
 *                           example: 8.2
 *                         count:
 *                           type: integer
 *                           example: 15
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/user/per-meal', authenticate, reportCtrl.userPerMeal);

/**
 * @swagger
 * /api/v1/reports/user/top-foods:
 *   get:
 *     tags: [Reports]
 *     summary: User top foods per meal
 *     description: Returns top foods the user logged per meal for the date range.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering data (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering data (ISO format)
 *       - in: query
 *         name: top
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of top foods to return per meal
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top foods per meal retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   description: Top foods grouped by meal type
 *                   items:
 *                     type: object
 *                     properties:
 *                       meal:
 *                         type: string
 *                         example: breakfast
 *                         description: Meal type (breakfast, lunch, dinner, snack)
 *                       foods:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             food:
 *                               type: object
 *                               properties:
 *                                 _id:
 *                                   type: string
 *                                   example: "507f1f77bcf86cd799439011"
 *                                 name:
 *                                   type: string
 *                                   example: "Oatmeal"
 *                                 nutritionalInfo:
 *                                   type: object
 *                                   properties:
 *                                     calories:
 *                                       type: number
 *                                       example: 150
 *                                     protein:
 *                                       type: number
 *                                       example: 5
 *                                     carb:
 *                                       type: number
 *                                       example: 27
 *                                     fat:
 *                                       type: number
 *                                       example: 3
 *                             count:
 *                               type: integer
 *                               example: 12
 *                               description: Number of times this food was logged
 *                             avgCalories:
 *                               type: number
 *                               format: float
 *                               example: 155.5
 *                             avgProtein:
 *                               type: number
 *                               format: float
 *                               example: 5.2
 *                             avgCarb:
 *                               type: number
 *                               format: float
 *                               example: 28.1
 *                             avgFat:
 *                               type: number
 *                               format: float
 *                               example: 3.1
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/user/top-foods', authenticate, reportCtrl.userTopFoods);

module.exports = router;
