const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    target_type: {
      type: String,
      enum: ['Post', 'Comment'],
      required: true,
    },
    target_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'target_type',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index để đảm bảo 1 user chỉ like 1 target 1 lần
likeSchema.index({ user: 1, target_type: 1, target_id: 1 }, { unique: true });

// Index để query nhanh "post này được like bởi ai?"
likeSchema.index({ target_type: 1, target_id: 1 });

// Index để query "user này đã like những gì gần đây?"
likeSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Like', likeSchema);
