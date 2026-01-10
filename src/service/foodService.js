const Food = require("../model/foodModel");
const User = require("../model/userModel");
const AppError = require("../libs/util/AppError");
const { aggregateConditions } = require("../libs/conditions/recommendConditions");
const NodeCache = require("node-cache");
const caching = new NodeCache({ checkperiod: 3600 });
const FoodLog = require("../model/foodLogModel");

class FoodService {
    // 📦 READ operations
    async getFoods(categories, meal, tags, page, limit) {
        const filter = {};
        if (categories) {
            filter.category = { $in: categories.split(',') };
        }

        if (meal) {
            filter.meal = meal;
        }

        if (tags) {
            filter.tags = { $in: tags.split(',') };
        }

        if (!page) page = 1;
        if (!limit) limit = 10;

        const result = await Food
            .find(filter)
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Food.countDocuments(filter, { postedBy: { $exists: false } });

        const parsedLimit = parseInt(limit);

        const meta = {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parsedLimit),
            totalItems: total,
            itemsPerPage: parsedLimit
        };

        return {
            result,
            meta
        };
    }

    async getTodayMeals(userId, foodId) {
        const weeklyPlan = await this.weeklyFoodRecommendation(userId);
        const today = new Date().toISOString().split('T')[0];
        const todayMeals = weeklyPlan.find(day => day.date === today);

        const { isNonRecommendedExisted, meal } = caching.get(`adaptiveMeals:${userId}:${this.getCurrentWeekKey()}:${today}-nonRecommendedExisted`) || {};

        if (!foodId) {
            if (isNonRecommendedExisted) {
                caching.del(`adaptiveMeals:${userId}:${this.getCurrentWeekKey()}:${today}-nonRecommendedExisted`);
            }

            return todayMeals;
        } else {
            const food = await Food.findById(foodId);
            if (!food) {
                throw new AppError('Food not found', 404);
            }

            const mealType = food.meal;

            if (isNonRecommendedExisted && mealType !== meal) {
                throw new AppError('You have already chose a non-recommended meal today. You can only log one non-recommended meal per day.', 400);
            }

            const adaptiveMeals = await this.getAdaptiveMeals(food, userId, todayMeals);

            caching.set(
                `adaptiveMeals:${userId}:${this.getCurrentWeekKey()}:${today}-nonRecommendedExisted`,
                {
                    isNonRecommendedExisted: true,
                    meal: mealType
                },
                this.getSecondsUntilMidnight());

            const adaptiveMealsResponse = {
                date: todayMeals.date,
                dayName: todayMeals.dayName,
                meals: adaptiveMeals
            };
            return adaptiveMealsResponse;
        }
    }

    async resetTodayMeals(userId) {
        try {
            caching.del(`adaptiveMeals:${userId}:${this.getCurrentWeekKey()}:${today}-nonRecommendedExisted`);
            const weeklyPlan = await this.weeklyFoodRecommendation(userId);
            const today = new Date().toISOString().split('T')[0];
            const todayMeals = weeklyPlan.find(day => day.date === today);
            return todayMeals;
        }
        catch (error) {
            throw new AppError('Failed to reset today meals cache', 500);
        }
    }

    getCachedWeeklyPlan(userId) {
        const cacheKey = `weekly:${userId}:${this.getCurrentWeekKey()}`;
        const cached = caching.get(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }

    async weeklyFoodRecommendation(userId, options = {}) {
        const cacheKey = `weekly:${userId}:${this.getCurrentWeekKey()}`;

        const cached = caching.get(cacheKey);
        if (cached) {
            console.log("Cache hit for weekly recommendation");
            return JSON.parse(cached);
        }

        const weeklyPlan = await this.generateWeeklyPlan(userId, false);
        const ttl = this.getSecondsUntilMidnight();

        caching.set(cacheKey, JSON.stringify(weeklyPlan), ttl);
        return weeklyPlan;
    }

    async getFoodById(foodId) {
        const food = await Food.findById(foodId);

        if (!food) {
            throw new AppError('Food not found', 404);
        }

        console.log("food:", food);

        return food;
    }

    async getFoodsByUserId(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const parsedLimit = parseInt(limit);

        const foods = await Food.find({ postedBy: userId })
            .skip(skip)
            .limit(parsedLimit)
            .sort({ createdAt: -1 });

        const total = await Food.countDocuments({ postedBy: userId });

        const meta = {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parsedLimit),
            totalItems: total,
            itemsPerPage: parsedLimit
        };

        return { result: foods, meta };
    }

    async getAdminFoods(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const parsedLimit = parseInt(limit);

        const foods = await Food.find({ postedBy: { $exists: false } })
            .skip(skip)
            .limit(parsedLimit)
            .sort({ createdAt: -1 });

        const total = await Food.countDocuments({ postedBy: { $exists: false } });

        const meta = {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parsedLimit),
            totalItems: total,
            itemsPerPage: parsedLimit
        };

        return { result: foods, meta };
    }

    // ✏️ CREATE / UPDATE / DELETE
    async createFoodByAdmin(foodInfo) {
        const newFood = await Food.create({ ...foodInfo });
        caching.flushAll(); // Clear all caches when food data changes
        return newFood;
    };

    async createFoodByUser(foodInfo, userId) {
        const newFood = await Food.create({ ...foodInfo, postedBy: userId });
        caching.flushAll(); // Clear all caches when food data changes
        return newFood;
    };

    async updateFood(foodId, foodInfo, userId) {
        const existingFood = await Food.findById(foodId);

        if (!existingFood) {
            throw new AppError('Food not found', 404);
        }

        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }


        const isAdmin = user.role === "admin";

        let isOwner = false;
        if (!isAdmin) {
            isOwner = existingFood.postedBy.toString() === userId.toString();
        }

        if (!isAdmin && !isOwner) {
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

        caching.flushAll(); // Clear all caches when food data changes
        return updatedFood;
    }

    async deleteFoodByAdmin(foodId) {
        const food = await Food.findById(foodId);

        if (!food) {
            throw new AppError(404, "Food not found");
        }

        // Admin can delete any food, just mark as inactive or actually delete
        await Food.findByIdAndDelete(foodId);
        // OR soft delete: await Food.findByIdAndUpdate(foodId, { isActive: false });

        return food;
    }

    async deleteFoodByUser(foodId, userId) {
        const food = await Food.findById(foodId);

        if (!food) {
            throw new AppError(404, "Food not found");
        }

        // Validate that the user owns this food
        if (!food.postedBy || food.postedBy.toString() !== userId.toString()) {
            throw new AppError(403, "You can only delete your own foods");
        }

        await Food.findByIdAndDelete(foodId);
        // OR soft delete: await Food.findByIdAndUpdate(foodId, { isActive: false });

        return food;
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
        caching.flushAll();
        return { message: 'All weekly recommendation caches cleared' };
    }

    async getAdaptiveMeals(food, user, todayMeals) {
        let adaptiveMeals = {};
        const today = new Date().toISOString().split('T')[0];
        const allergensCondition = {
            allergens: { $nin: user.allergies || [] },
            isActive: true,
        };

        if (food) {
            switch (food.meal) {
                case "breakfast": {
                    const lunch = await Food.aggregate(
                        await aggregateConditions(user, 'lunch', allergensCondition, true)
                    );

                    const dinner = await Food.aggregate(
                        await aggregateConditions(user, 'dinner', allergensCondition, true)
                    );

                    const snack = await Food.find({
                        meal: 'snack',
                    }).limit(1);

                    adaptiveMeals.breakfast = [food];
                    adaptiveMeals.lunch = lunch;
                    adaptiveMeals.dinner = dinner;
                    adaptiveMeals.snack = snack;

                    const remaingMealsCacheKey = `remainingMeals:${user._id}:${this.getCurrentWeekKey()}:${today}:remaining`;
                    caching.set(remaingMealsCacheKey, JSON.stringify(adaptiveMeals), this.getSecondsUntilMidnight());

                    break;
                }
                case "lunch":
                    const remaingMealsCacheKey = `remainingMeals:${user._id}:${this.getCurrentWeekKey()}:${today}:remaining`;
                    const cached = caching.get(remaingMealsCacheKey);
                    if (cached) {
                        const dinner = JSON.parse(cached).dinner;
                        adaptiveMeals.dinner = dinner;
                    } else {
                        const breakfast = await Food.aggregate(
                            await aggregateConditions(user, 'breakfast', allergensCondition, true)
                        );
                        const dinner = await Food.aggregate(
                            await aggregateConditions(user, 'dinner', allergensCondition, true)
                        );
                        const snack = await Food.find({
                            meal: 'snack',
                        }).limit(1);
                        adaptiveMeals.breakfast = breakfast;
                        adaptiveMeals.lunch = [food];
                        adaptiveMeals.dinner = dinner;
                        adaptiveMeals.snack = snack;
                    }
                    break;
                case "dinner":
                    const remainingMealsCacheKey = `remainingMeals:${user._id}:${this.getCurrentWeekKey()}:${today}:remaining`;
                    const cachedMeals = caching.get(remainingMealsCacheKey);
                    if (cachedMeals) {
                        const breakfast = JSON.parse(cachedMeals).breakfast;
                        const lunch = JSON.parse(cachedMeals).lunch;
                        adaptiveMeals.breakfast = breakfast;
                        adaptiveMeals.lunch = lunch;
                    } else {
                        const breakfast = await Food.aggregate(
                            await aggregateConditions(user, 'breakfast', allergensCondition, true)
                        );
                        const lunch = await Food.aggregate(
                            await aggregateConditions(user, 'lunch', allergensCondition, true)
                        );
                        const snack = await Food.find({
                            meal: 'snack',
                        }).limit(1);
                        adaptiveMeals.breakfast = breakfast;
                        adaptiveMeals.lunch = lunch;
                        adaptiveMeals.dinner = [food];
                        adaptiveMeals.snack = snack;
                    }
                    break;
                default:
                    break;
            }
        } else {
            adaptiveMeals = { ...todayMeals.meals };
        }

        return adaptiveMeals;
    }

    // async getAdaptiveRecommendation(user, todayMeals) {
    //     const weeklyPlan = await this.weeklyFoodRecommendation(user._id);
    //     const today = new Date().toISOString().split('T')[0];
    //     const todayMeals = weeklyPlan.find(day => day.date === today);

    //     let remainingMeals = {};

    //     remainingMeals = await this.getRemainingMeals(food, user, todayMeals);

    //     return remainingMeals;
    // }

    // async getRemainingMeals(remainingMeals, user, todayMeals) {
    //     const today = new Date().toISOString().split('T')[0];
    //     const todayLogs = await FoodLog.find({ user, date: today }).populate('food');
    //     const allergensCondition = {
    //         allergens: { $nin: user.allergies || [] },
    //         isActive: true,
    //     };

    //     if (todayLogs.length > 0) {
    //         const latestLog = todayLogs[todayLogs.length - 1];
    //         const isNonRecommended = todayLogs.some(log => log.source !== 'recommended');
    //         switch (latestLog.meal) {
    //             case "breakfast": {
    //                 if (!isNonRecommended) {
    //                     remainingMeals = { lunch: [...todayMeals.meals.lunch], dinner: [...todayMeals.meals.dinner], snack: [...todayMeals.meals.snack] };
    //                 } else {
    //                     const lunch = await Food.aggregate(
    //                         await aggregateConditions(user, 'lunch', allergensCondition, true)
    //                     );

    //                     const dinner = await Food.aggregate(
    //                         await aggregateConditions(user, 'dinner', allergensCondition, true)
    //                     );

    //                     const snack = await Food.find({
    //                         meal: 'snack',

    //                     }).limit(1);

    //                     remainingMeals.lunch = lunch;
    //                     remainingMeals.dinner = dinner;
    //                     remainingMeals.snack = snack;

    //                     const remaingMealsCacheKey = `remainingMeals:${user._id}:${this.getCurrentWeekKey()}:${today}:remaining`;
    //                     caching.set(remaingMealsCacheKey, JSON.stringify(remainingMeals), this.getSecondsUntilMidnight());
    //                 }
    //                 break;
    //             }
    //             case "lunch":
    //                 if (!isNonRecommended) {
    //                     todayMeals.meals.lunch = undefined;
    //                     remainingMeals = { dinner: [...todayMeals.meals.dinner], snack: [...todayMeals.meals.snack] };
    //                 } else {
    //                     const remaingMealsCacheKey = `remainingMeals:${userId}:${this.getCurrentWeekKey()}:${today}:remaining`;
    //                     const cached = caching.get(remaingMealsCacheKey);
    //                     if (cached) {
    //                         const dinner = JSON.parse(cached).dinner;
    //                         remainingMeals.dinner = dinner;
    //                     } else {
    //                         const dinner = await Food.aggregate(
    //                             await aggregateConditions(user, 'dinner', allergensCondition, true)
    //                         );

    //                         remainingMeals.dinner = dinner;
    //                     }
    //                     const snack = await Food.find({
    //                         meal: 'snack',

    //                     }).limit(1);
    //                     remainingMeals.snack = snack;
    //                 }
    //                 break;
    //             // Note: no need to handle dinner and snack cases because the remaining calories will be for these 2 meals
    //             default:
    //                 break;
    //         }
    //     } else {
    //         remainingMeals = { ...todayMeals.meals };
    //     }

    //     return remainingMeals;
    // }
}

module.exports = new FoodService();
