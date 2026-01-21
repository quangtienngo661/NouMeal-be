const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'post_like',
        'post_comment',
        'comment_like',
        'comment_reply',
        'follow',
        'mention',
      ],
      required: true,
    },
    target_type: {
      type: String,
      enum: ['Post', 'Comment', 'User'],
      required: true,
    },
    target_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'target_type',
    },
    // Dữ liệu bổ sung cho notification
    metadata: {
      post_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
      comment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
      parent_comment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
      text_preview: String, // Preview của comment/post
    },
    is_read: {
      type: Boolean,
      default: false,
      index: true,
    },
    read_at: {
      type: Date,
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

// Compound indexes
notificationSchema.index({ recipient: 1, is_read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ sender: 1, createdAt: -1 });

// Tự động xóa notifications cũ hơn 30 ngày
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

module.exports = mongoose.model('Notification', notificationSchema);
