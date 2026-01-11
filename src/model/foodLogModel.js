// src/model/foodLogModel.js
const mongoose = require('mongoose');

const foodLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    food: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Food',
        required: true
    },
    meal: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        required: true
    },
    date: {
        type: String, // "YYYY-MM-DD"
        required: true,
        index: true
    },
    servings: {
        type: Number,
        default: 1,
        min: 0.1
    },
    // Snapshot nutrition (in case food gets deleted/edited later)
    nutritionSnapshot: {
        calories: { type: Number, required: true },
        protein: { type: Number, required: true },
        carbs: { type: Number, required: true },
        fat: { type: Number, required: true }
    },
    loggedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

foodLogSchema.index({ userId: 1, date: 1 });
foodLogSchema.index({ userId: 1, date: 1, meal: 1 });

module.exports = mongoose.model('FoodLog', foodLogSchema);