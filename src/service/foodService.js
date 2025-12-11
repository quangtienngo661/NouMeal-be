const Food = require("../model/foodModel");
const User = require("../model/userModel");
const AppError = require("../libs/util/AppError");
const { aggregateConditions } = require("../libs/conditions/recommendConditions");
const NodeCache = require("node-cache");
const weeklyCache = new NodeCache({ checkperiod: 3600 });
const FoodLog = require("../model/foodLogModel");
const FoodLogService = require("./foodLogService");
const mongoose = require("mongoose");
const { all } = require("axios");

class FoodService {
    // 📦 READ operations
    async getFoods() {
        return await Food.find();
    }

    async getAdaptiveRecommendation(userId) {
        const weeklyPlan = await this.weeklyFoodRecommendation(userId);
        const today = new Date().toISOString().split('T')[0];
        const todayMeals = weeklyPlan.find(day => day.date === today);

        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const allergensCondition = {
            allergens: { $nin: user.allergies || [] },
            isActive: true,
        };

        const todayLogs = await FoodLog.find({ user, date: today }).populate('food');
        let remainingMeals = {};

        if (todayLogs.length > 0) {
            const latestLog = todayLogs[todayLogs.length - 1];
            const isNonRecommended = todayLogs.some(log => log.source !== 'recommended');
            switch (latestLog.meal) { 
                case "breakfast": {
                    // const breakfasts = todayMeals.meals.breakfast.filter((food, index) => {
                    //     return food._id.toString() === latestLog.food._id.toString()
                    // });
                    if (!isNonRecommended) {
                        remainingMeals = { lunch: [...todayMeals.meals.lunch], dinner: [...todayMeals.meals.dinner], snack: [...todayMeals.meals.snack] };
                    } else {
                        const lunch = await Food.aggregate(
                            await aggregateConditions(user, 'lunch', allergensCondition, true)
                        );

                        const dinner = await Food.aggregate(
                            await aggregateConditions(user, 'dinner', allergensCondition, true)
                        );

                        const snack = await Food.find({
                            meal: 'snack',

                        }).limit(1);

                        remainingMeals.lunch = lunch;
                        remainingMeals.dinner = dinner;
                        remainingMeals.snack = snack;

                        const remaingMealsCacheKey = `remainingMeals:${userId}:${this.getCurrentWeekKey()}:${today}:remaining`;
                        weeklyCache.set(remaingMealsCacheKey, JSON.stringify(remainingMeals), this.getSecondsUntilMidnight());
                    }
                    break;
                }
                case "lunch":
                    if (!isNonRecommended) {
                        todayMeals.meals.lunch = undefined;
                        remainingMeals = { dinner: [...todayMeals.meals.dinner], snack: [...todayMeals.meals.snack]  };
                    } else {
                        const remaingMealsCacheKey = `remainingMeals:${userId}:${this.getCurrentWeekKey()}:${today}:remaining`;
                        const cached = weeklyCache.get(remaingMealsCacheKey);
                        if (cached) {
                            const dinner = JSON.parse(cached).dinner;
                            remainingMeals.dinner = dinner;
                        } else {
                            const dinner = await Food.aggregate(
                                await aggregateConditions(user, 'dinner', allergensCondition, true)
                            );
                            
                            remainingMeals.dinner = dinner;
                        }
                        const snack = await Food.find({
                            meal: 'snack',

                        }).limit(1);
                        remainingMeals.snack = snack;
                    }
                    break;
                // Note: no need to handle dinner and snack cases because the remaining calories will be for these 2 meals
                default:
                    break;
            }
        } else {
            remainingMeals = { ...todayMeals.meals };
        }
        // return todayMeals?.meals || await this.generateDailyFallback(userId);
        return remainingMeals;
    }

    getCachedWeeklyPlan(userId) {
        const cacheKey = `weekly:${userId}:${this.getCurrentWeekKey()}`;
        const cached = weeklyCache.get(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }

    async weeklyFoodRecommendation(userId, options = {}) {
        const cacheKey = `weekly:${userId}:${this.getCurrentWeekKey()}`;
        
        const cached = weeklyCache.get(cacheKey);
        if (cached) {
            console.log("Cache hit for weekly recommendation");
            return JSON.parse(cached);
        }
        
        const weeklyPlan = await this.generateWeeklyPlan(userId, false);
        const ttl = this.getSecondsUntilMidnight();
        
        weeklyCache.set(cacheKey, JSON.stringify(weeklyPlan), ttl);
        return weeklyPlan;
    }

    async getFoodById(foodId) {
        const food = await Food.findById(foodId);

        if (!food) {
            throw new AppError('Food not found', 404);
        }

        return food;
    }

    // ✏️ CREATE / UPDATE / DELETE
    async createFood(foodInfo, userId) {
        const newFood = await Food.create({ ...foodInfo, postedBy: userId });
        weeklyCache.flushAll(); // Clear all caches when food data changes
        return newFood;
    };
    async updateFood(foodId, foodInfo, userId) {
        const existingFood = await Food.findById(foodId);

        if (!existingFood) {
            throw new AppError('Food not found', 404);
        }

        if (existingFood.postedBy && existingFood.postedBy.toString() !== userId.toString()) {
            throw new AppError('You are not authorized to update this food', 403);
        }

        const updatedFood = await Food.findByIdAndUpdate(
            foodId,
            { ...foodInfo },
            {
                runValidators: true,
                new: true
            }
        );

        weeklyCache.flushAll(); // Clear all caches when food data changes
        return updatedFood;
    }
    async deleteFood(foodId, userId) {
        const existingFood = await Food.findById(foodId);

        if (!existingFood) {
            throw new AppError('Food not found', 404);
        }

        if (existingFood.postedBy && existingFood.postedBy.toString() !== userId.toString()) {
            throw new AppError('You are not authorized to delete this food', 403);
        }

        const deletedFood = await Food.findByIdAndDelete(foodId);

        weeklyCache.flushAll(); // Clear all caches when food data changes
        return deletedFood;
    }


    // Internal methods
    getWeekDate(offset) {
        const now = new Date();
        const dayOfWeek = now.getDay();

        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const start = new Date(now);
        start.setDate(now.getDate() - diffToMonday);

        const weekDate = new Date(start);
        weekDate.setDate(start.getDate() + offset);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);


        const formatDate = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        return {
            startDate: formatDate(start),
            weekDate: {
                date: formatDate(weekDate),
                dayName: dayName[weekDate.getDay()]
            },
            endDate: formatDate(end),
        };
    }

    async getDayWithExclusions(user, usedIds, isDiff = false, isCached = true) {
        const allergensCondition = {
            allergens: { $nin: user.allergies || [] },
            isActive: true,
            _id: { $nin: Array.from(usedIds) }
        };

        // console.log(allergensCondition);

        const breakfast = await Food.aggregate(
            await aggregateConditions(user, 'breakfast', allergensCondition, isDiff, isCached)
        );

        const lunch = await Food.aggregate(
            await aggregateConditions(user, 'lunch', allergensCondition, isDiff, isCached)
        );

        const dinner = await Food.aggregate(
            await aggregateConditions(user, 'dinner', allergensCondition, isDiff, isCached)
        );

        const snack = await Food.find({
            meal: 'snack',
            _id: { $nin: Array.from(usedIds) }
        }).limit(1);

        return {
            breakfast: breakfast,
            lunch: lunch,
            dinner: dinner,
            snack: snack
        };
    }

    async generateDailyFallback(userId) {
        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const allergensCondition = {
            allergens: { $nin: user.allergies || [] },
            isActive: true
        };

        const breakfastFoods = await Food.aggregate(await aggregateConditions(user, 'breakfast', allergensCondition));
        const lunchFoods = await Food.aggregate(await aggregateConditions(user, 'lunch', allergensCondition));
        const dinnerFoods = await Food.aggregate(await aggregateConditions(user, 'dinner', allergensCondition));
        const snacks = await Food.find({ meal: 'snack' }).limit(1);

        return {
            breakfast: breakfastFoods,
            lunch: lunchFoods,
            dinner: dinnerFoods,
            snack: snacks
        }
    }

    async generateWeeklyPlan(userId, isCached) {
        const usedIds = new Set();
        const days = [];

        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }


        for (let i = 0; i < 7; i++) {
            const dayMeals = await this.getDayWithExclusions(user, usedIds, false, isCached);
            days.push({
                date: this.getWeekDate(i).weekDate.date,
                dayName: this.getWeekDate(i).weekDate.dayName,
                meals: dayMeals
            });

            // Track all food IDs from arrays (each meal now has multiple foods)
            Object.values(dayMeals).forEach(foodArray => {
                if (Array.isArray(foodArray)) {
                    foodArray.forEach(food => {
                        if (food && food._id) {
                            usedIds.add(food._id);
                        }
                    });
                }
            });

            // Reset diversity tracker every 3 days
            if (i > 0 && i % 3 === 0) usedIds.clear();
        }

        return days;
    }

    getCurrentWeekKey() {
        const { startDate, endDate } = this.getWeekDate(0);
        return `${startDate}_to_${endDate}`;
    }

    getSecondsUntilMidnight() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return Math.floor((midnight - now) / 1000);
    }

    async clearAllCache() {
        weeklyCache.flushAll();
        return { message: 'All weekly recommendation caches cleared' };
    }
}

module.exports = new FoodService();
