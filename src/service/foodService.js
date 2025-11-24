const Food = require("../model/foodModel");
const User = require("../model/userModel");
const AppError = require("../libs/util/AppError");
const { conditionsByGoal, conditionsByHealthIndex, mealConditions, nutritiousFoodConditions, aggregateConditions } = require("../libs/conditions/recommendConditions");

class FoodService {
    // constructor() {}

    // 📦 READ operations
    async getFoods() {
        return await Food.find();
    }

    async foodsRecommendation(userId) {
        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const allergensCondition = {
            allergens: { $nin: user.allergies || [] },
            isActive: true
        };

        const breakfastFoods = await Food.aggregate(aggregateConditions(user, 'breakfast', allergensCondition));
        const lunchFoods = await Food.aggregate(aggregateConditions(user, 'lunch', allergensCondition));
        const dinnerFoods = await Food.aggregate(aggregateConditions(user, 'dinner', allergensCondition));
        const snacks = await Food.find({ meal: 'snack' }).limit(5);

        return {
            breakfast: breakfastFoods,
            lunch: lunchFoods,
            dinner: dinnerFoods,
            snack: snacks
        }
    }

    async getFoodById(foodId) {
        const food = await Food.findById(foodId);

        if (!food) {
            throw new AppError('Food not found', 404);
        }

        return food;
    }

    // ✏️ CREATE / UPDATE / DELETE
    async createFood(foodInfo) {
        const newFood = await Food.create({ ...foodInfo });
        return newFood;
    };
    async updateFood(foodId, foodInfo) {
        const updatedFood = await Food.findByIdAndUpdate(
            foodId,
            { ...foodInfo },
            {
                runValidators: true,
                new: true
            }
        );

        if (!updatedFood) {
            throw new AppError('Food not found', 404);
        }

        return updatedFood;
    }
    async deleteFood(foodId) {
        const deletedFood = await Food.findByIdAndDelete(foodId);

        if (!deletedFood) {
            throw new AppError('Food not found', 404);
        }

        return deletedFood;
    }
}

module.exports = new FoodService();
