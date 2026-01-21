const Notification = require('../model/notificationModel');
const Post = require('../model/postModel');
const Comment = require('../model/commentModel');
const User = require('../model/userModel');
const AppError = require('../libs/util/AppError');

class NotificationService {
  // Tạo notification khi có người like post
  async createPostLikeNotification(postId, likerId) {
    try {
      const post = await Post.findById(postId).select('author text').lean();
      if (!post) return;

      // Không tạo notification nếu like chính post của mình
      if (post.author.toString() === likerId.toString()) return;

      // Kiểm tra xem đã có notification tương tự chưa (trong 1 phút gần đây)
      const recentNotification = await Notification.findOne({
        recipient: post.author,
        sender: likerId,
        type: 'post_like',
        target_id: postId,
        createdAt: { $gte: new Date(Date.now() - 60000) },
      });

      if (recentNotification) return;

      await Notification.create({
        recipient: post.author,
        sender: likerId,
        type: 'post_like',
        target_type: 'Post',
        target_id: postId,
        metadata: {
          post_id: postId,
          text_preview: post.text?.substring(0, 100) || '',
        },
      });
    } catch (error) {
      console.error('Error creating post like notification:', error);
    }
  }

  // Tạo notification khi có người comment vào post
  async createPostCommentNotification(commentId, postId, commenterId) {
    try {
      const [post, comment] = await Promise.all([
        Post.findById(postId).select('author text').lean(),
        Comment.findById(commentId).select('content').lean(),
      ]);

      if (!post || !comment) return;

      // Không tạo notification nếu comment vào chính post của mình
      if (post.author.toString() === commenterId.toString()) return;

      await Notification.create({
        recipient: post.author,
        sender: commenterId,
        type: 'post_comment',
        target_type: 'Comment',
        target_id: commentId,
        metadata: {
          post_id: postId,
          comment_id: commentId,
          text_preview: comment.content?.text?.substring(0, 100) || '',
        },
      });
    } catch (error) {
      console.error('Error creating post comment notification:', error);
    }
  }

  // Tạo notification khi có người like comment
  async createCommentLikeNotification(commentId, likerId) {
    try {
      const comment = await Comment.findById(commentId)
        .select('author content post')
        .lean();
      if (!comment) return;

      // Không tạo notification nếu like chính comment của mình
      if (comment.author.toString() === likerId.toString()) return;

      const recentNotification = await Notification.findOne({
        recipient: comment.author,
        sender: likerId,
        type: 'comment_like',
        target_id: commentId,
        createdAt: { $gte: new Date(Date.now() - 60000) },
      });

      if (recentNotification) return;

      await Notification.create({
        recipient: comment.author,
        sender: likerId,
        type: 'comment_like',
        target_type: 'Comment',
        target_id: commentId,
        metadata: {
          post_id: comment.post,
          comment_id: commentId,
          text_preview: comment.content?.text?.substring(0, 100) || '',
        },
      });
    } catch (error) {
      console.error('Error creating comment like notification:', error);
    }
  }

  // Tạo notification khi có người reply comment
  async createCommentReplyNotification(replyId, parentCommentId, replierId) {
    try {
      const [parentComment, reply] = await Promise.all([
        Comment.findById(parentCommentId).select('author post content').lean(),
        Comment.findById(replyId).select('content').lean(),
      ]);

      if (!parentComment || !reply) return;

      // Không tạo notification nếu reply chính comment của mình
      if (parentComment.author.toString() === replierId.toString()) return;

      await Notification.create({
        recipient: parentComment.author,
        sender: replierId,
        type: 'comment_reply',
        target_type: 'Comment',
        target_id: replyId,
        metadata: {
          post_id: parentComment.post,
          comment_id: replyId,
          parent_comment_id: parentCommentId,
          text_preview: reply.content?.text?.substring(0, 100) || '',
        },
      });
    } catch (error) {
      console.error('Error creating comment reply notification:', error);
    }
  }

  // Tạo notification khi có người follow
  async createFollowNotification(followerId, followedUserId) {
    try {
      // Không tạo notification nếu follow chính mình
      if (followerId.toString() === followedUserId.toString()) return;

      // Kiểm tra xem đã có notification tương tự chưa (trong 1 phút gần đây)
      const recentNotification = await Notification.findOne({
        recipient: followedUserId,
        sender: followerId,
        type: 'follow',
        target_id: followerId,
        createdAt: { $gte: new Date(Date.now() - 60000) },
      });

      if (recentNotification) return;

      await Notification.create({
        recipient: followedUserId,
        sender: followerId,
        type: 'follow',
        target_type: 'User',
        target_id: followerId,
      });
    } catch (error) {
      console.error('Error creating follow notification:', error);
    }
  }

  // Lấy danh sách notifications của user - CẢI TIẾN
  async getUserNotifications(userId, options = {}) {
    try {
      const { page = 1, limit = 20, unreadOnly = false, type = null } = options;

      const query = { recipient: userId };
      if (unreadOnly) query.is_read = false;
      if (type) query.type = type;

      const skip = (page - 1) * limit;

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(query)
          .populate('sender', 'name avatar username') // Thêm username
          .populate('target_id') // Populate dynamic target
          .populate({
            path: 'metadata.post_id',
            select: 'text images author',
            populate: { path: 'author', select: 'name username' },
          })
          .populate({
            path: 'metadata.comment_id',
            select: 'content author',
            populate: { path: 'author', select: 'name username' },
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query),
        Notification.countDocuments({ recipient: userId, is_read: false }),
      ]);

      return {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        unread_count: unreadCount,
      };
    } catch (error) {
      throw new AppError(`Error getting notifications: ${error.message}`, 500);
    }
  }

  // Đánh dấu notification là đã đọc
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { $set: { is_read: true, read_at: new Date() } },
        { new: true }
      )
        .populate('sender', 'name avatar username')
        .populate('target_id');

      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      return notification;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error marking as read: ${error.message}`, 500);
    }
  }

  // Đánh dấu tất cả notifications là đã đọc
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, is_read: false },
        { $set: { is_read: true, read_at: new Date() } }
      );

      return {
        message: 'All notifications marked as read',
        modified_count: result.modifiedCount,
      };
    } catch (error) {
      throw new AppError(`Error marking all as read: ${error.message}`, 500);
    }
  }

  // Xóa notification
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId,
      });

      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      return { message: 'Notification deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error deleting notification: ${error.message}`, 500);
    }
  }

  // Xóa tất cả notifications đã đọc
  async deleteReadNotifications(userId) {
    try {
      const result = await Notification.deleteMany({
        recipient: userId,
        is_read: true,
      });

      return {
        message: 'Read notifications deleted successfully',
        deleted_count: result.deletedCount,
      };
    } catch (error) {
      throw new AppError(
        `Error deleting read notifications: ${error.message}`,
        500
      );
    }
  }

  // Lấy số lượng notifications chưa đọc
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        recipient: userId,
        is_read: false,
      });

      return { unread_count: count };
    } catch (error) {
      throw new AppError(`Error getting unread count: ${error.message}`, 500);
    }
  }

  // THÊM: Xóa notifications theo type
  async deleteNotificationsByType(userId, type) {
    try {
      const result = await Notification.deleteMany({
        recipient: userId,
        type,
      });

      return {
        message: `${type} notifications deleted successfully`,
        deleted_count: result.deletedCount,
      };
    } catch (error) {
      throw new AppError(
        `Error deleting notifications by type: ${error.message}`,
        500
      );
    }
  }
}

module.exports = new NotificationService();
