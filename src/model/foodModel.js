const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
      maxlength: [100, 'Food name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    instructions: [
      {
        step: {
          type: Number,
          min: [1, 'Instruction step number must be at least 1'],
          required: [true, 'Instruction step number is required'],
        },
        description: {
          type: String,
          required: [true, 'Instruction step description is required'],
          trim: true,
          maxlength: [500, 'Instruction step description cannot exceed 500 characters'],
        },
      },
    ],
    imageUrl: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Food category is required'],
      enum: {
        values: [
          'fruits',
          'vegetables',
          'grains',
          'protein',
          'dairy',
          'fats',
          'beverages',
          'snacks',
          'desserts',
          'spices',
        ],
        message:
          'Category must be one of: fruits, vegetables, grains, protein, dairy, fats, beverages, snacks, desserts, spices',
      },
    },
    meal: {
      type: String,
      enum: [
        'breakfast',
        'lunch',
        'dinner',
        'snack'
      ]
    },
    ingredients: [
      {
        name: { type: String, required: true, trim: true },
        amount: { type: String, trim: true }, // ví dụ: "200g", "1 cup"
      },
    ],
    nutritionalInfo: {
      calories: {
        type: Number,
        min: [0, 'Calories cannot be negative'],
      },
      protein: {
        type: Number,
        min: [0, 'Protein cannot be negative'],
      },
      carbohydrates: {
        type: Number,
        min: [0, 'Carbohydrates cannot be negative'],
      },
      fat: {
        type: Number,
        min: [0, 'Fat cannot be negative'],
      },
      fiber: {
        type: Number,
        min: [0, 'Fiber cannot be negative'],
      },
      sugar: {
        type: Number,
        min: [0, 'Sugar cannot be negative'],
      },
      sodium: {
        type: Number,
        min: [0, 'Sodium cannot be negative'],
      },
      cholesterol: {
        type: Number,
        min: [0, 'Cholesterol cannot be negative'],
      },
    },
    allergens: [
      {
        type: String,
        trim: true,
        enum: [
          'peanuts',
          'tree_nuts',
          'milk',
          'eggs',
          'wheat_gluten',
          'fish',
          'shellfish',
          'soy',
          'corn',
          'sesame',
          'pineapple',
          'strawberry',
          'banana',
          'tomato',
          'apple',
          'chocolate',
          'honey',
          'mustard',
          'other',
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        enum: {
          values: [
            'vegetarian',
            'vegan',
            'pescatarian',
            'keto',
            'paleo',
            'low_carb',
            'low_fat',
            'high_protein',
            'gluten_free',
            'dairy_free',
            'halal',
            'kosher',
            'organic',
            'low_sodium',
            'diabetic_friendly',
            'heart_healthy',
          ],
          message: 'Invalid dietary preference',
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for faster searches
foodSchema.index({ name: 1 });
foodSchema.index({ category: 1 });
foodSchema.index({ tags: 1 });
foodSchema.index({ allergens: 1 });
foodSchema.index({ meal: 1 });

const Food = mongoose.model('Food', foodSchema);

module.exports = Food;
