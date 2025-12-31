const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    post_type: {
      type: String,
      enum: ['food_review', 'recipe', 'general'],
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Post content is required'],
      maxlength: 5000,
    },
    images: [String],
    food_review: {
      dish_name: String,
      calories: Number,
      protein: Number,
      carbohydrates: Number,
      fat: Number,
      fiber: Number,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      tags: [String],
    },
    recipe: {
      title: String,
      ingredients: [
        {
          name: String,
          amount: String,
          unit: String,
        },
      ],
      steps: [String],
      cooking_time: Number,
      servings: Number,
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
      },
    },
    engagement: {
      likes_count: { type: Number, default: 0 },
      comments_count: { type: Number, default: 0 },
      shares_count: { type: Number, default: 0 },
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
    },
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

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ post_type: 1 });
postSchema.index({ 'food_review.tags': 1 });
postSchema.index({ visibility: 1 });
postSchema.index({
  text: 'text',
  'recipe.title': 'text',
  'recipe.ingredients.name': 'text',
  'food_review.dish_name': 'text',
});
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
