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
  // Get today's date string in YYYY-MM-DD format based on timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = formatter.format(now); // "YYYY-MM-DD"
  
  // Use find() to get today's logs and calculate totals manually
  const logs = await FoodLog.find({ user: userId, date: todayStr }).lean();
  
  const totals = logs.reduce((acc, log) => {
    const servings = log.servings || 1;
    acc.calories += (log.nutritionSnapshot?.calories || 0) * servings;
    acc.protein += (log.nutritionSnapshot?.protein || 0) * servings;
    acc.carb += (log.nutritionSnapshot?.carbs || 0) * servings;
    acc.fat += (log.nutritionSnapshot?.fat || 0) * servings;
    return acc;
  }, { calories: 0, protein: 0, carb: 0, fat: 0 });
  
  return totals;
}

async function caloriesByMealToday(userId, { tz = 'UTC' } = {}) {
  // Get today's date string in YYYY-MM-DD format based on timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = formatter.format(now); // "YYYY-MM-DD"

  // Use find() and group manually
  const logs = await FoodLog.find({ user: userId, date: todayStr }).lean();
  
  const byMeal = {};
  logs.forEach(log => {
    const mealType = log.meal;
    const servings = log.servings || 1;
    const calories = (log.nutritionSnapshot?.calories || 0) * servings;
    
    if (!byMeal[mealType]) {
      byMeal[mealType] = { mealType, calories: 0 };
    }
    byMeal[mealType].calories += calories;
  });
  
  return Object.values(byMeal);
}

async function recentLoggedFoods(userId, { limit = 10 } = {}) {
  const logs = await FoodLog.find({ user: asObjectId(userId) })
    .sort({ loggedAt: -1 })
    .limit(limit)
    .populate('food')
    .lean();
  
  return logs.map(l => ({
    id: l._id,
    loggedAt: l.loggedAt,
    date: l.date,
    mealType: l.meal,
    servings: l.servings,
    calories: (l.nutritionSnapshot?.calories || 0) * (l.servings || 1),
    protein: (l.nutritionSnapshot?.protein || 0) * (l.servings || 1),
    carb: (l.nutritionSnapshot?.carbs || 0) * (l.servings || 1),
    fat: (l.nutritionSnapshot?.fat || 0) * (l.servings || 1),
    food: l.food
  }));
}

async function timeSeriesCaloriesAndMacros(userId, { startDate, endDate, groupBy = 'day', tz = 'UTC' } = {}) {
  // Build query filter
  const query = { user: userId };
  
  // Convert dates to YYYY-MM-DD format for comparison with date field
  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      query.date.$gte = formatter.format(startDate);
    }
    if (endDate) {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      query.date.$lte = formatter.format(endDate);
    }
  }

  // Fetch logs and group manually
  const logs = await FoodLog.find(query).lean();
  
  // Group by date (or week/month based on groupBy)
  const groupedData = {};
  
  logs.forEach(log => {
    let groupKey = log.date; // Default: group by day (YYYY-MM-DD)
    
    if (groupBy === 'week') {
      // Get the Monday of the week
      const d = new Date(log.date + 'T00:00:00Z');
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      d.setUTCDate(diff);
      groupKey = d.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      groupKey = log.date.substring(0, 7) + '-01'; // YYYY-MM-01
    }
    
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = { calories: 0, protein: 0, carb: 0, fat: 0 };
    }
    
    const servings = log.servings || 1;
    groupedData[groupKey].calories += (log.nutritionSnapshot?.calories || 0) * servings;
    groupedData[groupKey].protein += (log.nutritionSnapshot?.protein || 0) * servings;
    groupedData[groupKey].carb += (log.nutritionSnapshot?.carbs || 0) * servings;
    groupedData[groupKey].fat += (log.nutritionSnapshot?.fat || 0) * servings;
  });
  
  // Convert to array and add percentages
  const rows = Object.entries(groupedData)
    .map(([dateStr, data]) => ({ date: new Date(dateStr + 'T00:00:00Z'), ...data }))
    .sort((a, b) => a.date - b.date);
  
  return rows.map(r => {
    const proteinCals = (r.protein || 0) * 4;
    const fatCals = (r.fat || 0) * 9;
    const carbCals = (r.carb || 0) * 4;
    const sumCals = proteinCals + fatCals + carbCals || 1;
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

async function perMealAnalysis(userId, { startDate, endDate, tz = 'UTC' } = {}) {
  // Build query filter
  const query = { user: userId };
  
  // Convert dates to YYYY-MM-DD format for comparison with date field
  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      query.date.$gte = formatter.format(startDate);
    }
    if (endDate) {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      query.date.$lte = formatter.format(endDate);
    }
  }

  // Fetch logs and group by meal type
  const logs = await FoodLog.find(query).lean();
  
  const mealStats = {};
  logs.forEach(log => {
    const mealType = log.meal;
    const servings = log.servings || 1;
    const calories = (log.nutritionSnapshot?.calories || 0) * servings;
    const protein = (log.nutritionSnapshot?.protein || 0) * servings;
    
    if (!mealStats[mealType]) {
      mealStats[mealType] = { mealType, totalCalories: 0, totalProtein: 0, count: 0 };
    }
    mealStats[mealType].totalCalories += calories;
    mealStats[mealType].totalProtein += protein;
    mealStats[mealType].count += 1;
  });
  
  const rows = Object.values(mealStats).map(stat => ({
    mealType: stat.mealType,
    avgCalories: stat.count > 0 ? stat.totalCalories / stat.count : 0,
    avgProtein: stat.count > 0 ? stat.totalProtein / stat.count : 0,
    count: stat.count
  }));
  
  // find highest avg calories and lowest avg protein
  let highestCalories = null;
  let lowestProtein = null;
  rows.forEach(r => {
    if (!highestCalories || r.avgCalories > highestCalories.avgCalories) highestCalories = r;
    if (!lowestProtein || r.avgProtein < lowestProtein.avgProtein) lowestProtein = r;
  });
  return { perMeal: rows, highestCalories, lowestProtein };
}

async function topFoodsPerMeal(userId, { startDate, endDate, top = 5, tz = 'UTC' } = {}) {
  // Build query filter
  const query = { user: userId };
  
  // Convert dates to YYYY-MM-DD format for comparison with date field
  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      query.date.$gte = formatter.format(startDate);
    }
    if (endDate) {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      query.date.$lte = formatter.format(endDate);
    }
  }

  // Fetch logs and group by meal and food
  const logs = await FoodLog.find(query).lean();
  
  // Group by meal -> food
  const mealFoodStats = {};
  logs.forEach(log => {
    const mealType = log.meal;
    const foodId = log.food?.toString() || log.food;
    const servings = log.servings || 1;
    
    if (!mealFoodStats[mealType]) {
      mealFoodStats[mealType] = {};
    }
    if (!mealFoodStats[mealType][foodId]) {
      mealFoodStats[mealType][foodId] = {
        food: foodId,
        count: 0,
        totalCalories: 0,
        totalProtein: 0,
        totalCarb: 0,
        totalFat: 0
      };
    }
    
    const stat = mealFoodStats[mealType][foodId];
    stat.count += 1;
    stat.totalCalories += (log.nutritionSnapshot?.calories || 0) * servings;
    stat.totalProtein += (log.nutritionSnapshot?.protein || 0) * servings;
    stat.totalCarb += (log.nutritionSnapshot?.carbs || 0) * servings;
    stat.totalFat += (log.nutritionSnapshot?.fat || 0) * servings;
  });
  
  // Convert to array format and get top foods per meal
  const rows = [];
  for (const [mealType, foodStats] of Object.entries(mealFoodStats)) {
    const foods = Object.values(foodStats)
      .map(stat => ({
        food: stat.food,
        count: stat.count,
        avgCalories: stat.count > 0 ? stat.totalCalories / stat.count : 0,
        avgProtein: stat.count > 0 ? stat.totalProtein / stat.count : 0,
        avgCarb: stat.count > 0 ? stat.totalCarb / stat.count : 0,
        avgFat: stat.count > 0 ? stat.totalFat / stat.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, top);
    
    rows.push({ meal: mealType, foods });
  }
  
  // Populate food details
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
