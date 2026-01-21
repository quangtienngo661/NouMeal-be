const Comment = require('../model/commentModel');
const Post = require('../model/postModel');
const Like = require('../model/likeModel');
const User = require('../model/userModel');
const AppError = require('../libs/util/AppError');
const NotificationService = require('./notificationServices');
class CommentService {
  async createComment(commentData) {
    try {
      const { post, author, parent_comment } = commentData;

      if (!post || !author) {
        throw new Error('Post ID and Author ID are required');
      }

      const existingPost = await Post.findById(post);
      if (!existingPost) {
        throw new Error('Post not found');
      }

      if (parent_comment) {
        const parent = await Comment.findById(parent_comment);
        if (!parent) throw new Error('Parent comment not found');
      }

      const user = await User.findById(author).select('name');
      if (!user) throw new Error('User not found');
      commentData.authorname = user.name;

      const newComment = new Comment(commentData);
      await newComment.save();

      await Post.findByIdAndUpdate(post, {
        $inc: { 'engagement.comments_count': 1 },
      });

      if (parent_comment) {
        await Comment.findByIdAndUpdate(parent_comment, {
          $inc: { replies_count: 1 },
        });

        await NotificationService.createCommentReplyNotification(
          newComment._id,
          parent_comment,
          author
        );
      } else {
        await NotificationService.createPostCommentNotification(
          newComment._id,
          post,
          author
        );
      }

      return await this.getCommentById(newComment._id, author);
    } catch (error) {
      throw new Error(`Error creating comment: ${error.message}`);
    }
  }

  async getCommentById(commentId, requestingUserId = null) {
    try {
      const comment = await Comment.findById(commentId)
        .populate('post', 'post_type visibility author')
        .populate('parent_comment', '_id author')
        .lean();

      if (!comment) throw new Error('Comment not found');

      // ✅ Manually fetch author info to get name
      if (comment.author) {
        const author = await User.findById(comment.author)
          .select('name email')
          .lean();
        if (author) {
          comment.author = author;
          comment.author_name = author.name;
        } else {
          comment.author_name = comment.authorname;
        }
      } else {
        comment.author_name = comment.authorname;
      }

      if (requestingUserId) {
        const hasLiked = await Like.exists({
          user: requestingUserId,
          target_type: 'Comment',
          target_id: commentId,
        });
        comment.has_liked = !!hasLiked;
      } else {
        comment.has_liked = false;
      }

      return comment;
    } catch (error) {
      throw new Error(`Error retrieving comment: ${error.message}`);
    }
  }

  async getCommentByPost(postId, userId = null, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        order = 'desc',
      } = options;

      const post = await Post.findById(postId).lean();
      if (!post) throw new Error('Post not found');

      const skip = (page - 1) * limit;
      const sort = { createdAt: order === 'desc' ? -1 : 1 };
      const query = { post: postId, parent_comment: null, is_deleted: false };

      const [comments, total] = await Promise.all([
        Comment.find(query).sort(sort).skip(skip).limit(limit).lean(),
        Comment.countDocuments(query),
      ]);

      // ✅ Manually fetch author info for each comment
      const authorIds = [...new Set(comments.map((c) => c.author.toString()))];
      const authors = await User.find({ _id: { $in: authorIds } })
        .select('name email')
        .lean();

      const authorMap = new Map(authors.map((a) => [a._id.toString(), a]));

      comments.forEach((comment) => {
        const author = authorMap.get(comment.author.toString());
        if (author) {
          comment.author = author;
          comment.author_name = author.name;
        } else {
          comment.author_name = comment.authorname;
        }
      });

      if (userId) {
        const commentIds = comments.map((c) => c._id);
        const likes = await Like.find({
          user: userId,
          target_type: 'Comment',
          target_id: { $in: commentIds },
        }).lean();

        const likedSet = new Set(likes.map((l) => l.target_id.toString()));

        comments.forEach((comment) => {
          comment.has_liked = likedSet.has(comment._id.toString());
        });
      } else {
        comments.forEach((comment) => {
          comment.has_liked = false;
        });
      }

      return {
        comments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error getting comments by post: ${error.message}`);
    }
  }

  async getRepliesByComment(commentId, userId = null, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        order = 'desc',
      } = options;

      const skip = (page - 1) * limit;
      const sort = { createdAt: order === 'desc' ? -1 : 1 };
      const query = { parent_comment: commentId, is_deleted: false };

      const [replies, total] = await Promise.all([
        Comment.find(query).sort(sort).skip(skip).limit(limit).lean(),
        Comment.countDocuments(query),
      ]);

      // ✅ Manually fetch author info for each reply
      const authorIds = [...new Set(replies.map((r) => r.author.toString()))];
      const authors = await User.find({ _id: { $in: authorIds } })
        .select('name email')
        .lean();

      const authorMap = new Map(authors.map((a) => [a._id.toString(), a]));

      replies.forEach((reply) => {
        const author = authorMap.get(reply.author.toString());
        if (author) {
          reply.author = author;
          reply.author_name = author.name;
        } else {
          reply.author_name = reply.authorname;
        }
      });

      if (userId) {
        const replyIds = replies.map((r) => r._id);
        const likes = await Like.find({
          user: userId,
          target_type: 'Comment',
          target_id: { $in: replyIds },
        }).lean();

        const likedSet = new Set(likes.map((l) => l.target_id.toString()));

        replies.forEach((reply) => {
          reply.has_liked = likedSet.has(reply._id.toString());
        });
      } else {
        replies.forEach((reply) => {
          reply.has_liked = false;
        });
      }

      return {
        replies,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error getting replies: ${error.message}`);
    }
  }

  async updateComment(commentId, updateData, requestingUserId) {
    try {
      const comment = await Comment.findById(commentId);
      if (!comment) throw new Error('Comment not found');

      if (comment.author.toString() !== requestingUserId.toString()) {
        throw new Error('Unauthorized to update this comment');
      }

      const forbiddenFields = [
        'post',
        'author',
        'authorname', // ✅ Also protect authorname
        'parent_comment',
        'replies_count',
        'likes_count',
        'is_deleted',
      ];

      for (const field of forbiddenFields) {
        if (field in updateData) {
          delete updateData[field];
        }
      }

      Object.assign(comment, updateData);
      await comment.save();
      return await this.getCommentById(commentId, requestingUserId);
    } catch (error) {
      throw new Error(`Error updating comment: ${error.message}`);
    }
  }

  async deleteComment(commentId, requestingUserId) {
    try {
      const comment = await Comment.findById(commentId);
      if (!comment) throw new Error('Comment not found');

      if (comment.author.toString() !== requestingUserId.toString()) {
        throw new Error('Unauthorized to delete this comment');
      }

      comment.is_deleted = true;
      await comment.save();

      await Post.findByIdAndUpdate(comment.post, {
        $inc: { 'engagement.comments_count': -1 },
      });

      if (comment.parent_comment) {
        await Comment.findByIdAndUpdate(comment.parent_comment, {
          $inc: { replies_count: -1 },
        });
      }

      return { message: 'Comment deleted successfully' };
    } catch (error) {
      throw new Error(`Error deleting comment: ${error.message}`);
    }
  }

  async likeComment(commentId, userId) {
    try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new AppError('Comment not found', 404);
      }

      const existingLike = await Like.findOne({
        user: userId,
        target_type: 'Comment',
        target_id: commentId,
      });

      if (existingLike) {
        throw new AppError('You have already liked this comment', 400);
      }

      await Like.create({
        user: userId,
        target_type: 'Comment',
        target_id: commentId,
      });

      const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likes_count: 1 } },
        { new: true }
      );

      return {
        comment_id: commentId,
        likes_count: updatedComment.likes_count,
        has_liked: true,
      };
    } catch (error) {
      throw error;
    }
  }

  async unlikeComment(commentId, userId) {
    try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new AppError('Comment not found', 404);
      }

      const existingLike = await Like.findOne({
        user: userId,
        target_type: 'Comment',
        target_id: commentId,
      });

      if (!existingLike) {
        throw new AppError('You have not liked this comment', 400);
      }

      await Like.deleteOne({
        user: userId,
        target_type: 'Comment',
        target_id: commentId,
      });

      const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likes_count: -1 } },
        { new: true }
      );

      return {
        comment_id: commentId,
        likes_count: updatedComment.likes_count,
        has_liked: false,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CommentService();
