const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorname: {
      type: String,
      required: true,
    },
    content: {
      text: {
        type: String,
        required: [true, 'Comment content is required'],
        maxlength: 1000,
      },
      media: [
        {
          type: { type: String, enum: ['image'] },
          url: { type: String },
          thumbnailUrl: { type: String },
        },
      ],
    },
    parent_comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    replies_count: { type: Number, default: 0 },
    likes_count: { type: Number, default: 0 },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
    },
    is_deleted: {
      type: Boolean,
      default: false,
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

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parent_comment: 1 });
commentSchema.index({ visibility: 1 });
commentSchema.index({ 'content.text': 'text' });

module.exports = mongoose.model('Comment', commentSchema);
