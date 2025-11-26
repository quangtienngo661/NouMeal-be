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
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *       - in: query
 *         name: tz
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview data
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
 *         description: Demographics data
 */
router.get('/admin/demographics', authenticate, restrictTo('admin'), reportCtrl.adminDemographics);
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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top foods data
 */
router.get('/admin/top-foods', authenticate, restrictTo('admin'), reportCtrl.adminTopFoods);

// USER endpoints (authenticated)
router.get('/user/summary', authenticate, reportCtrl.userDashboardToday);

/**
 * @swagger
 * /api/v1/reports/user/timeseries:
 *   get:
 *     tags: [Reports]
 *     summary: User timeseries calories/macros
 *     description: Returns aggregated calories and macros for the authenticated user.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Time series data
 */
router.get('/user/timeseries', authenticate, reportCtrl.userTimeSeries);
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
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: top
 *         schema:
 *           type: integer
 *           default: 5
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top foods per meal
 */
router.get('/user/top-foods', authenticate, reportCtrl.userTopFoods);

module.exports = router;
