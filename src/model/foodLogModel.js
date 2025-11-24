const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const foodLogSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true, 
  },
  
  food: {
    type: Schema.Types.ObjectId,
    ref: 'Food',
    required: true,
  },
  
  eatenAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true, 
  },
  
  mealType: {
    type: String,
    required: true,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
  },
  
  servingSize: {
    type: Number,
    required: true,
    default: 1, 
  },
  
  calories: {
    type: Number,
    required: true,
  },
  protein: {
    type: Number,
    required: true,
  },
  carb: {
    type: Number,
    required: true,
  },
  fat: {
    type: Number,
    required: true,
  },
}, { 
  timestamps: true 
});

const FoodLog = mongoose.model('FoodLog', foodLogSchema);
module.exports = FoodLog;
