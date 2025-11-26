const mongoose = require('mongoose');
const User = require('../model/userModel');
const Food = require('../model/foodModel');
const FoodLog = require('../model/foodLogModel');

// Helper: build dateTrunc expression unit from groupBy
function getTruncUnit(groupBy) {
  switch ((groupBy || 'day').toLowerCase()) {
    case 'week':
      return 'week';
    case 'month':
      return 'month';
    default:
      return 'day';
  }
}

// Parse dates safely
function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Safely convert a value to ObjectId when possible.
// Some versions of mongodb/mongoose expose ObjectId as a class that must be
// called with `new`. Use this helper to avoid calling the constructor incorrectly.
function asObjectId(id) {
  if (!id) return id;
  try {
    if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  } catch (e) {
    // fallthrough: return original id so queries that accept strings still work
  }
  return id;
}

/* =====================
 * ADMIN: User statistics
 * ===================== */

async function getTotalUsers({ startDate, endDate } = {}) {
  const match = {};
  if (startDate || endDate) match.createdAt = {};
  if (startDate) match.createdAt.$gte = startDate;
  if (endDate) match.createdAt.$lte = endDate;
  const count = await User.countDocuments(match);
  return { totalUsers: count };
}

async function getNewUsersOverTime({ startDate, endDate, groupBy = 'day', tz = 'UTC' } = {}) {
  const unit = getTruncUnit(groupBy);
  const match = {};
  if (startDate || endDate) match.createdAt = {};
  if (startDate) match.createdAt.$gte = startDate;
  if (endDate) match.createdAt.$lte = endDate;

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: {
          $dateTrunc: { date: '$createdAt', unit, timezone: tz }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        count: 1,
        _id: 0
      }
    }
  ];

  return User.aggregate(pipeline).allowDiskUse(true);
}

async function getActiveUsersSummary() {
  const total = await User.countDocuments({});
  const active = await User.countDocuments({ isActive: true });
  const percent = total ? Number(((active / total) * 100).toFixed(2)) : 0;
  return { total, active, activePercent: percent };
}

async function getUsersLoggedIn({ sinceDate } = {}) {
  const match = {};
  if (sinceDate) match.lastLogin = { $gte: sinceDate };
  const count = await User.countDocuments(match);
  return { count };
}

async function countUnverifiedEmails() {
  const count = await User.countDocuments({ isEmailVerified: false });
  return { unverified: count };
}

/* ================
 * ADMIN: Demographics
 * ================ */

async function genderDistribution() {
  const pipeline = [
    { $group: { _id: '$gender', count: { $sum: 1 } } },
    { $project: { gender: '$_id', count: 1, _id: 0 } },
    { $sort: { count: -1 } }
  ];
  const data = await User.aggregate(pipeline);
  const total = data.reduce((s, x) => s + x.count, 0);
  return { total, breakdown: data.map(d => ({ gender: d.gender, count: d.count, percent: total ? Number(((d.count/total)*100).toFixed(2)) : 0 })) };
}

async function ageDistribution() {
  const buckets = [
    { name: '13-18', min: 13, max: 18 },
    { name: '18-25', min: 18, max: 25 },
    { name: '25-35', min: 25, max: 35 },
    { name: '35-50', min: 35, max: 50 },
    { name: '50+', min: 50, max: 200 }
  ];
  const facets = {};
  buckets.forEach(b => {
    const key = b.name.replace('+', 'plus');
    facets[key] = [
      { $match: { age: { $gte: b.min, $lte: b.max } } },
      { $count: 'count' }
    ];
  });
  const res = await User.aggregate([{ $facet: facets }]);
  const row = res[0] || {};
  const total = await User.countDocuments({ age: { $exists: true } });
  const breakdown = buckets.map(b => {
    const key = b.name.replace('+', 'plus');
    const count = (row[key] && row[key][0] && row[key][0].count) || 0;
    return { bucket: b.name, count, percent: total ? Number(((count/total)*100).toFixed(2)) : 0 };
  });
  return { total, breakdown };
}

async function avgHeightWeightByGender() {
  const pipeline = [
    { $match: { height: { $exists: true }, weight: { $exists: true } } },
    { $group: { _id: '$gender', avgHeight: { $avg: '$height' }, avgWeight: { $avg: '$weight' }, count: { $sum: 1 } } },
    { $project: { gender: '$_id', avgHeight: 1, avgWeight: 1, count: 1, _id: 0 } }
  ];
  return User.aggregate(pipeline);
}

async function goalDistribution() {
  const pipeline = [
    { $group: { _id: '$goal', count: { $sum: 1 } } },
    { $project: { goal: '$_id', count: 1, _id: 0 } },
    { $sort: { count: -1 } }
  ];
  const data = await User.aggregate(pipeline);
  const total = data.reduce((s, x) => s + x.count, 0);
  return { total, breakdown: data.map(d => ({ goal: d.goal, count: d.count, percent: total ? Number(((d.count/total)*100).toFixed(2)) : 0 })) };
}

// Activity distribution (sedentary, lightly_active, etc.)
async function activityDistribution() {
  const pipeline = [
    { $group: { _id: '$activity', count: { $sum: 1 } } },
    { $project: { activity: '$_id', count: 1, _id: 0 } },
    { $sort: { count: -1 } }
  ];
  const data = await User.aggregate(pipeline);
  const total = data.reduce((s, x) => s + x.count, 0);
  return {
    total,
    breakdown: data.map(d => ({ activity: d.activity, count: d.count, percent: total ? Number(((d.count/total)*100).toFixed(2)) : 0 }))
  };
}

// Allergies distribution (counts of each allergy across users)
async function allergiesDistribution() {
  const pipeline = [
    { $unwind: { path: '$allergies', preserveNullAndEmptyArrays: false } },
    { $group: { _id: '$allergies', count: { $sum: 1 } } },
    { $project: { allergy: '$_id', count: 1, _id: 0 } },
    { $sort: { count: -1 } }
  ];
  const data = await User.aggregate(pipeline);
  const total = data.reduce((s, x) => s + x.count, 0);
  return {
    total,
    breakdown: data.map(d => ({ allergy: d.allergy, count: d.count, percent: total ? Number(((d.count/total)*100).toFixed(2)) : 0 }))
  };
}

/* ==================
 * ADMIN: Food stats
 * ==================*/

async function totalFoods() {
  const total = await Food.countDocuments({});
  return { total };
}

async function foodsByCategory() {
  const data = await Food.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $project: { category: '$_id', count: 1, _id: 0 } },
    { $sort: { count: -1 } }
  ]);
  return data;
}

async function foodsByMeal() {
  const data = await Food.aggregate([
    { $group: { _id: '$meal', count: { $sum: 1 } } },
    { $project: { meal: '$_id', count: 1, _id: 0 } }
  ]);
  return data;
}

async function newFoodsPerMonth({ months = 12, tz = 'UTC' } = {}) {
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  const pipeline = [
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: { $dateTrunc: { date: '$createdAt', unit: 'month', timezone: tz } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', count: 1, _id: 0 } }
  ];
  return Food.aggregate(pipeline);
}

async function topFoodsByCalories({ top = 10, sort = 'desc' } = {}) {
  const order = sort === 'asc' ? 1 : -1;
  return Food.aggregate([
    { $project: { name: 1, calories: '$nutritionalInfo.calories', allergens: 1 } },
    { $sort: { calories: order } },
    { $limit: top }
  ]);
}

async function foodsWithMostAllergens({ top = 10 } = {}) {
  return Food.aggregate([
    { $project: { name: 1, allergensCount: { $size: { $ifNull: ['$allergens', []] } }, allergens: 1 } },
    { $sort: { allergensCount: -1 } },
    { $limit: top }
  ]);
}

/* ==================
 * USER: Personal stats
 * ==================*/

// Estimate daily calories using Mifflin-St Jeor and activity factor
function estimateDailyCalories({ weight, height, age, gender, activity, goal }) {
  // weight kg, height cm, age years
  if (!weight || !height || !age || !gender) return null;
  const w = Number(weight);
  const h = Number(height);
  const a = Number(age);
  let bmr = 0;
  if (gender === 'male') bmr = 10 * w + 6.25 * h - 5 * a + 5;
  else if (gender === 'female') bmr = 10 * w + 6.25 * h - 5 * a - 161;
  else bmr = 10 * w + 6.25 * h - 5 * a; // neutral

  const activityFactors = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9
  };
  const factor = activityFactors[activity] || 1.2;
  let calories = bmr * factor;
  if (goal === 'lose_weight') calories = calories - 500;
  if (goal === 'gain_weight') calories = calories + 500;
  return Math.round(calories);
}

async function getTodayTotals(userId, { tz = 'UTC' } = {}) {
  const now = new Date();
  // truncate to day UTC or provided tz via $dateTrunc in pipeline
  const pipeline = [
    { $match: { user: asObjectId(userId) } },
    {
      $addFields: {
        eatenDay: { $dateTrunc: { date: '$eatenAt', unit: 'day', timezone: tz } }
      }
    },
    {
      $match: { eatenDay: { $eq: { $dateTrunc: { date: now, unit: 'day', timezone: tz } } } }
    },
    {
      $group: {
        _id: null,
        calories: { $sum: '$calories' },
        protein: { $sum: '$protein' },
        carb: { $sum: '$carb' },
        fat: { $sum: '$fat' }
      }
    },
    { $project: { _id: 0, calories: 1, protein: 1, carb: 1, fat: 1 } }
  ];
  const res = await FoodLog.aggregate(pipeline);
  return res[0] || { calories: 0, protein: 0, carb: 0, fat: 0 };
}

async function caloriesByMealToday(userId, { tz = 'UTC' } = {}) {
  const now = new Date();
  const pipeline = [
    { $match: { user: asObjectId(userId) } },
    { $addFields: { eatenDay: { $dateTrunc: { date: '$eatenAt', unit: 'day', timezone: tz } } } },
    { $match: { eatenDay: { $eq: { $dateTrunc: { date: now, unit: 'day', timezone: tz } } } } },
    { $group: { _id: '$mealType', calories: { $sum: '$calories' } } },
    { $project: { mealType: '$_id', calories: 1, _id: 0 } }
  ];
  return FoodLog.aggregate(pipeline);
}

async function recentLoggedFoods(userId, { limit = 10 } = {}) {
  const logs = await FoodLog.find({ user: asObjectId(userId) }).sort({ eatenAt: -1 }).limit(limit).populate('food').lean();
  return logs.map(l => ({ id: l._id, eatenAt: l.eatenAt, mealType: l.mealType, servingSize: l.servingSize, calories: l.calories, protein: l.protein, carb: l.carb, fat: l.fat, food: l.food }));
}

async function timeSeriesCaloriesAndMacros(userId, { startDate, endDate, groupBy = 'day', tz = 'UTC' } = {}) {
  const unit = getTruncUnit(groupBy);
  const match = { user: asObjectId(userId) };
  if (startDate || endDate) match.eatenAt = {};
  if (startDate) match.eatenAt.$gte = startDate;
  if (endDate) match.eatenAt.$lte = endDate;

  const pipeline = [
    { $match: match },
    { $group: { _id: { $dateTrunc: { date: '$eatenAt', unit, timezone: tz } }, calories: { $sum: '$calories' }, protein: { $sum: '$protein' }, carb: { $sum: '$carb' }, fat: { $sum: '$fat' } } },
    { $sort: { '_id': 1 } },
    { $project: { date: '$_id', calories: 1, protein: 1, carb: 1, fat: 1, _id: 0 } }
  ];
  const rows = await FoodLog.aggregate(pipeline);
  // add P/C/F percentages
  return rows.map(r => {
    const total = (r.calories || 0) || 1;
    const proteinCals = (r.protein || 0) * 4;
    const fatCals = (r.fat || 0) * 9;
    const carbCals = (r.carb || 0) * 4;
    const sumCals = proteinCals + fatCals + carbCals || total;
    return {
      date: r.date,
      calories: r.calories || 0,
      protein: r.protein || 0,
      carb: r.carb || 0,
      fat: r.fat || 0,
      pct: {
        protein: Number(((proteinCals / sumCals) * 100).toFixed(1)),
        carbs: Number(((carbCals / sumCals) * 100).toFixed(1)),
        fat: Number(((fatCals / sumCals) * 100).toFixed(1))
      }
    };
  });
}

async function perMealAnalysis(userId, { startDate, endDate } = {}) {
  const match = { user: asObjectId(userId) };
  if (startDate || endDate) match.eatenAt = {};
  if (startDate) match.eatenAt.$gte = startDate;
  if (endDate) match.eatenAt.$lte = endDate;

  const pipeline = [
    { $match: match },
    { $group: { _id: '$mealType', avgCalories: { $avg: '$calories' }, avgProtein: { $avg: '$protein' }, count: { $sum: 1 } } },
    { $project: { mealType: '$_id', avgCalories: 1, avgProtein: 1, count: 1, _id: 0 } }
  ];
  const rows = await FoodLog.aggregate(pipeline);
  // find highest avg calories and lowest avg protein
  let highestCalories = null;
  let lowestProtein = null;
  rows.forEach(r => {
    if (!highestCalories || r.avgCalories > highestCalories.avgCalories) highestCalories = r;
    if (!lowestProtein || r.avgProtein < lowestProtein.avgProtein) lowestProtein = r;
  });
  return { perMeal: rows, highestCalories, lowestProtein };
}

async function topFoodsPerMeal(userId, { startDate, endDate, top = 5 } = {}) {
  const match = { user: asObjectId(userId) };
  if (startDate || endDate) match.eatenAt = {};
  if (startDate) match.eatenAt.$gte = startDate;
  if (endDate) match.eatenAt.$lte = endDate;

  const pipeline = [
    { $match: match },
    { $group: { _id: { meal: '$mealType', food: '$food' }, count: { $sum: 1 }, avgCalories: { $avg: '$calories' }, avgProtein: { $avg: '$protein' }, avgCarb: { $avg: '$carb' }, avgFat: { $avg: '$fat' } } },
    { $sort: { '_id.meal': 1, count: -1 } },
    { $group: { _id: '$_id.meal', foods: { $push: { food: '$_id.food', count: '$count', avgCalories: '$avgCalories', avgProtein: '$avgProtein', avgCarb: '$avgCarb', avgFat: '$avgFat' } } } },
    { $project: { meal: '$_id', foods: { $slice: ['$foods', top] }, _id: 0 } }
  ];
  const rows = await FoodLog.aggregate(pipeline);
  // populate food details separately for returned food ids
  for (const r of rows) {
    const foodIds = r.foods.map(f => f.food).filter(Boolean);
    if (foodIds.length) {
      const foods = await Food.find({ _id: { $in: foodIds } }).select('name nutritionalInfo').lean();
      const byId = {};
      foods.forEach(f => (byId[f._id.toString()] = f));
      r.foods = r.foods.map(f => ({ ...f, food: byId[f.food.toString()] || { _id: f.food } }));
    }
  }
  return rows;
}

module.exports = {
  // admin
  getTotalUsers,
  getNewUsersOverTime,
  getActiveUsersSummary,
  getUsersLoggedIn,
  countUnverifiedEmails,
  genderDistribution,
  ageDistribution,
  avgHeightWeightByGender,
  goalDistribution,
  activityDistribution,
  allergiesDistribution,
  // foods
  totalFoods,
  foodsByCategory,
  foodsByMeal,
  newFoodsPerMonth,
  topFoodsByCalories,
  foodsWithMostAllergens,
  // user
  estimateDailyCalories,
  getTodayTotals,
  caloriesByMealToday,
  recentLoggedFoods,
  timeSeriesCaloriesAndMacros,
  perMealAnalysis,
  topFoodsPerMeal
};
