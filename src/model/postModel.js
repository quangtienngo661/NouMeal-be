const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Post content is required'],
      maxlength: 5000,
      trim: true,
    },

    // Reference đến món ăn (0, 1 hoặc nhiều món)
    foods: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Food',
      },
    ],

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

    // Hashtags để dễ tìm kiếm
    hashtags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Tracking chỉnh sửa
    is_edited: {
      type: Boolean,
      default: false,
    },
    edited_at: {
      type: Date,
    },
    is_from_follower: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        const obj = { ...ret };
        delete obj.__v;
        return obj;
      },
    },
  }
);

// Indexes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ post_type: 1 });
postSchema.index({ foods: 1 });
postSchema.index({ visibility: 1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ 'food_review.tags': 1 });
postSchema.index({ createdAt: -1 });

// Text search
postSchema.index({
  text: 'text',
  'recipe.ingredients.name': 'text',
  hashtags: 'text',
});

postSchema.pre('findOneAndUpdate', function handleUpdate(next) {
  const update = this.getUpdate();
  if (update.$set && update.$set.text) {
    update.$set.is_edited = true;
    update.$set.edited_at = new Date();
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);
