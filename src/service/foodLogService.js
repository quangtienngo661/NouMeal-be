// const weeklyCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });
const { date } = require('joi');
const FoodLog = require('../model/foodLogModel');
const Food = require("../model/foodModel");
const User = require('../model/userModel');
const AppError = require('../libs/util/AppError');
const recommendConditions = require('../libs/conditions/recommendConditions');

class FoodLogService {
    async logMeal(userId, foodId) {
        const user = await User.findById(userId);
        const food = await Food.findById(foodId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (!food) {
            throw new AppError('Food not found', 404);
        }

        // Validate meal order: breakfast → lunch → dinner → snack
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = await FoodLog.find({ user: userId, date: today });

        const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
        const currentMealIndex = mealOrder.indexOf(food.meal);

        if (currentMealIndex === -1) {
            throw new AppError('Invalid meal type', 400);
        }

        // Check if this meal is already logged
        const alreadyLogged = todayLogs.some(log => log.meal === food.meal);
        if (alreadyLogged) {
            throw new AppError(`You have already logged ${food.meal} today`, 400);
        }

        // Check if previous meals have been logged
        for (let i = 0; i < currentMealIndex; i++) {
            const previousMeal = mealOrder[i];
            const previousMealLogged = todayLogs.some(log => log.meal === previousMeal);

            // console.log("validate previous meal");
            if (!previousMealLogged) {
                throw new AppError(
                    `Please log ${previousMeal} before logging ${food.meal}`,
                    400
                );
            }
        }



        // Check cache to determine if food is from recommendations (avoids circular dependency)
        const foodService = require('./foodService');
        const weeklyPlan = foodService.getCachedWeeklyPlan(userId);

        let isRecommended = false;
        if (weeklyPlan) {
            const todayMeals = weeklyPlan.find(day => day.date === today);
            if (todayMeals && todayMeals.meals[food.meal]) {
                isRecommended = todayMeals.meals[food.meal].some(
                    recommendedFood => recommendedFood._id.toString() === food._id.toString()
                );
            }
        }

        const existingNonRecommendedLog = todayLogs.some(log => log.source !== 'recommended');
        if (existingNonRecommendedLog && !isRecommended) {
            throw new AppError(
                `You have already logged a non-recommended meal today. You can only log one non-recommended meal per day.`,
                400
            );
        }

        const newFoodLog = await FoodLog.create({
            user: user._id,
            food: food._id,
            meal: food.meal,
            date: new Date().toISOString().split('T')[0],
            servings: 1,
            source: isRecommended ? 'recommended' : 'non_recommended',
            nutritionSnapshot: {
                calories: food.nutritionalInfo.calories,
                protein: food.nutritionalInfo.protein,
                fat: food.nutritionalInfo.fat,
                carbs: food.nutritionalInfo.carbohydrates
            }
        });

        return newFoodLog;
    }

    async getFoodLog(userId, date) {
        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }
        const logs = await FoodLog.find({ user: userId, date }).populate('food');
        return logs;
    }

    async getAllFoodLogs(userId) {
        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }
        const logs = await FoodLog.find({ user: userId })
            .populate('food')
            .sort({ date: -1, loggedAt: -1 });
        return logs;
    }

    async getTodayProgress(userId) {
        const today = new Date().toISOString().split('T')[0];
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        const logs = await this.getFoodLog(userId, today);
        // console.log(logs);


        const { totalCalories, macroProfile } = recommendConditions.nutritiousFoodConditions(user);
        // console.log({ totalCalories, macroProfile });

        const consumed = logs.reduce((acc, log) => {
            // console.log(log);
            acc.calories += log.nutritionSnapshot.calories;
            acc.protein += log.nutritionSnapshot.protein;
            acc.carbs += log.nutritionSnapshot.carbs;
            acc.fat += log.nutritionSnapshot.fat;
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });


        const remaining = {
            calories: Math.max(0, totalCalories - consumed.calories),
            protein: Math.max(0, macroProfile.protein - consumed.protein),
            carbs: Math.max(0, macroProfile.carb - consumed.carbs),
            fat: Math.max(0, macroProfile.fat - consumed.fat),
        }

        // console.log(remaining)
        const loggedMeals = logs.map(log => log.meal);
        const remainingMeals = ['breakfast', 'lunch', 'dinner', 'snack'].filter(meal => !loggedMeals.includes(meal));

        return {
            totalCalories,
            macroProfile,
            consumed,
            remaining,
            remainingMeals
        };
    }
}

module.exports = new FoodLogService();