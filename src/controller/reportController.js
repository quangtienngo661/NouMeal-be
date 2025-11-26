const reportService = require('../service/reportService');
const mongoose = require('mongoose');

// Helper parse dates
function parseDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// Normalize a date range: if start is null -> epoch (include all), if end is null -> now
function normalizeDateRange(startDate, endDate) {
  const s = startDate || new Date(0); // 1970-01-01 => include all older records
  const e = endDate || new Date(); // now
  return { startDate: s, endDate: e };
}

/**
 * Admin overview endpoint
 * Query params: startDate, endDate, groupBy(day|week|month), tz
 * Response: summary object for dashboard
 */
async function adminOverview(req, res, next) {
  try {
    const { startDate, endDate, groupBy, tz } = req.query;
    const sd = parseDate(startDate);
    const ed = parseDate(endDate);
    const { startDate: sDate, endDate: eDate } = normalizeDateRange(sd, ed);

    const [totalUsers, newUsersSeries, activeSummary, unverified] = await Promise.all([
      reportService.getTotalUsers({ startDate: sDate, endDate: eDate }),
      reportService.getNewUsersOverTime({ startDate: sDate, endDate: eDate, groupBy, tz }),
      reportService.getActiveUsersSummary(),
      reportService.countUnverifiedEmails()
    ]);

    res.json({ success: true, data: { totalUsers, newUsersSeries, activeSummary, unverified } });
  } catch (err) { next(err); }
}

/**
 * Admin demographics
 */
async function adminDemographics(req, res, next) {
  try {
    const [gender, age, avgHW, goals, activities, allergies] = await Promise.all([
      reportService.genderDistribution(),
      reportService.ageDistribution(),
      reportService.avgHeightWeightByGender(),
      reportService.goalDistribution(),
      reportService.activityDistribution(),
      reportService.allergiesDistribution()
    ]);
    res.json({ success: true, data: { gender, age, avgHeightWeightByGender: avgHW, goals, activities, allergies } });
  } catch (err) { next(err); }
}

/**
 * Admin food stats
 */
async function adminFoodOverview(req, res, next) {
  try {
    const [total, byCategory, byMeal, newPerMonth] = await Promise.all([
      reportService.totalFoods(),
      reportService.foodsByCategory(),
      reportService.foodsByMeal(),
      reportService.newFoodsPerMonth({ months: 12 })
    ]);
    res.json({ success: true, data: { total, byCategory, byMeal, newPerMonth } });
  } catch (err) { next(err); }
}

async function adminTopFoods(req, res, next) {
  try {
    const top = Number(req.query.top) || 10;
    const [highest, lowest, allergens] = await Promise.all([
      reportService.topFoodsByCalories({ top, sort: 'desc' }),
      reportService.topFoodsByCalories({ top, sort: 'asc' }),
      reportService.foodsWithMostAllergens({ top })
    ]);
    res.json({ success: true, data: { highest, lowest, allergens } });
  } catch (err) { next(err); }
}

/**
 * User endpoints (authenticated)
 * GET /user/summary
 */
async function userDashboardToday(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const tz = req.query.tz || 'UTC';
    const totals = await reportService.getTodayTotals(userId, { tz });
    const byMeal = await reportService.caloriesByMealToday(userId, { tz });
    const recent = await reportService.recentLoggedFoods(userId, { limit: 10 });

    // estimate recommended calories — assumes profile fields exist on req.user
    const recommended = reportService.estimateDailyCalories({ weight: req.user.weight, height: req.user.height, age: req.user.age, gender: req.user.gender, activity: req.user.activity, goal: req.user.goal });

    res.json({ success: true, data: { totals, byMeal, recent, recommended } });
  } catch (err) { next(err); }
}

async function userTimeSeries(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { startDate, endDate, groupBy, tz } = req.query;
    const sd = parseDate(startDate);
    const ed = parseDate(endDate);
    const { startDate: sDate, endDate: eDate } = normalizeDateRange(sd, ed);
    const rows = await reportService.timeSeriesCaloriesAndMacros(userId, { startDate: sDate, endDate: eDate, groupBy, tz });
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function userPerMeal(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { startDate, endDate } = req.query;
    const sd = parseDate(startDate);
    const ed = parseDate(endDate);
    const { startDate: sDate, endDate: eDate } = normalizeDateRange(sd, ed);
    const analysis = await reportService.perMealAnalysis(userId, { startDate: sDate, endDate: eDate });
    res.json({ success: true, data: analysis });
  } catch (err) { next(err); }
}

async function userTopFoods(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { startDate, endDate, top } = req.query;
    const sd = parseDate(startDate);
    const ed = parseDate(endDate);
    const { startDate: sDate, endDate: eDate } = normalizeDateRange(sd, ed);
    const rows = await reportService.topFoodsPerMeal(userId, { startDate: sDate, endDate: eDate, top: Number(top) || 5 });
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

module.exports = {
  adminOverview,
  adminDemographics,
  adminFoodOverview,
  adminTopFoods,
  userDashboardToday,
  userTimeSeries,
  userPerMeal,
  userTopFoods
};
