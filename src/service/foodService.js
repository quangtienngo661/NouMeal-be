const Food = require("../model/foodModel");
const User = require("../model/userModel");
const AppError = require("../libs/util/AppError");
const { aggregateConditions } = require("../libs/conditions/recommendConditions");

class FoodService {
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

    async weeklyFoodRecommendation(userId) {
        const usedIds = new Set();
        const days = [];

        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }


        for (let i = 0; i < 7; i++) {
            const dayMeals = await this.getDayWithExclusions(user, usedIds);
            days.push({
                date: this.getWeekDate(i).weekDate.date,
                dayName: this.getWeekDate(i).weekDate.dayName,
                meals: dayMeals
            });

            Object.values(dayMeals).forEach(food => usedIds.add(food._id));

            if (i > 0 && i % 3 === 0) usedIds.clear();
        }

        return days;
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
        return newFood;
    };
    async updateFood(foodId, foodInfo, userId) {
        if (updatedFood.postedBy.toString() !== userId.toString()) {
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

        if (!updatedFood) {
            throw new AppError('Food not found', 404);
        }

        return updatedFood;
    }
    async deleteFood(foodId, userId) {
        if (deletedFood.postedBy.toString() !== userId.toString()) {
            throw new AppError('You are not authorized to update this food', 403);
        }

        const deletedFood = await Food.findByIdAndDelete(foodId);

        if (!deletedFood) {
            throw new AppError('Food not found', 404);
        }

        return deletedFood;
    }

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

    async getDayWithExclusions(user, usedIds) {
        const allergensCondition = {
            allergens: { $nin: user.allergies || [] }, 
            isActive: true,                             
            _id: { $nin: Array.from(usedIds) }         
        };

        const breakfast = await Food.aggregate(
            aggregateConditions(user, 'breakfast', allergensCondition)
        );

        const lunch = await Food.aggregate(
            aggregateConditions(user, 'lunch', allergensCondition)
        );

        const dinner = await Food.aggregate(
            aggregateConditions(user, 'dinner', allergensCondition)
        );

        const snack = await Food.find({
            meal: 'snack',
            _id: { $nin: Array.from(usedIds) }
        }).limit(5);

        return {
            breakfast: breakfast[0],  
            lunch: lunch[0],
            dinner: dinner[0],
            snack: snack[0]
        };
    }
}

module.exports = new FoodService();
