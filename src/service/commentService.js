const Comment = require('../model/commentModel');
const Post = require('../model/postModel');

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

      // ✅ FIX: Đổi tên biến từ Comment thành newComment
      const newComment = new Comment(commentData);
      await newComment.save();

      await Post.findByIdAndUpdate(post, { $inc: { comments_count: 1 } });

      if (parent_comment) {
        // ✅ FIX: Sửa từ Post thành Comment
        await Comment.findByIdAndUpdate(parent_comment, {
          $inc: { replies_count: 1 },
        });
      }

      // ✅ FIX: Dùng newComment._id
      return await this.getCommentById(newComment._id, author);
    } catch (error) {
      throw new Error(`Error creating comment: ${error.message}`);
    }
  }

  async getCommentById(commentId, requestingUserId = null) {
    try {
      const comment = await Comment.findById(commentId)
        .populate('author', 'username email avatar')
        .populate('post', 'post_type visibility author')
        .populate('parent_comment', '_id author')
        .lean();

      if (!comment) throw new Error('Comment not found');
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
      // ✅ FIX: Sửa logic sort (desc = -1, asc = 1)
      const sort = { createdAt: order === 'desc' ? -1 : 1 };
      const query = { post: postId, parent_comment: null, is_deleted: false };

      const [comments, total] = await Promise.all([
        Comment.find(query)
          .populate('author', 'username email avatar')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Comment.countDocuments(query),
      ]);

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
      // ✅ FIX: Sửa logic sort
      const sort = { createdAt: order === 'desc' ? -1 : 1 };
      const query = { parent_comment: commentId, is_deleted: false };

      const [replies, total] = await Promise.all([
        Comment.find(query)
          .populate('author', 'username email avatar')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Comment.countDocuments(query),
      ]);

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

      // ✅ FIX: Sửa typo từ forrbidden thành forbidden
      const forbiddenFields = [
        'post',
        'author',
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
        $inc: { comments_count: -1 },
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

  async likeComment(commentId) {
    try {
      const comment = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likes_count: 1 } },
        { new: true }
      );

      if (!comment) {
        throw new Error('Comment not found');
      }
      return comment;
    } catch (error) {
      throw new Error(`Error liking comment: ${error.message}`);
    }
  }

  async unlikeComment(commentId) {
    try {
      const comment = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likes_count: -1 } },
        { new: true }
      );

      if (!comment) {
        throw new Error('Comment not found');
      }
      return comment;
    } catch (error) {
      throw new Error(`Error unliking comment: ${error.message}`);
    }
  }
}

module.exports = new CommentService();
