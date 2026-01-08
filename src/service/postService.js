const Post = require('../model/postModel');
const AppError = require('../libs/util/AppError');
const User = require('../model/userModel');
const Food = require('../model/foodModel');

class PostService {
  async createPost(postData) {
    try {
      // Validate post data
      await this._validatePostData(postData);

      // Extract hashtags from text
      const hashtags = this.extractHashtags(postData.text);

      const post = new Post({
        ...postData,
        hashtags: [...new Set([...(postData.hashtags || []), ...hashtags])], // Merge and deduplicate
      });

      await post.save();
      return await this.getPostById(post._id, postData.author);
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err) => err.message);
        throw new AppError(`Validation Error: ${errors.join(', ')}`, 400);
      }
      throw error;
    }
  }

  async getPostById(postId, userId = null) {
    try {
      const post = await Post.findById(postId)
        .populate('author', 'name email avatar')
        .populate({
          path: 'foods',
          select:
            'name description imageUrl category meal ingredients nutritionalInfo allergens tags postedBy isActive',
          match: { isActive: true }, // Only populate active foods
        })
        .lean();

      if (!post) {
        throw new AppError('Post not found', 404);
      }

      // Check visibility permissions
      if (!(await this._canViewPost(post, userId))) {
        throw new AppError('You do not have permission to view this post', 403);
      }

      return post;
    } catch (error) {
      throw error;
    }
  }

  async updatePost(postId, userId, updateData) {
    try {
      const post = await Post.findById(postId);

      if (!post) {
        throw new AppError('Post not found', 404);
      }

      // Check ownership
      if (post.author.toString() !== userId.toString()) {
        throw new AppError(
          'You do not have permission to update this post',
          403
        );
      }

      // Validate foods if updating
      if (updateData.foods) {
        await this._validateFoods(updateData.foods);
      }

      // Validate updated data
      await this._validatePostData({ ...post.toObject(), ...updateData });

      // Extract and merge hashtags if text is updated
      if (updateData.text) {
        const newHashtags = this.extractHashtags(updateData.text);
        updateData.hashtags = [
          ...new Set([...(updateData.hashtags || []), ...newHashtags]),
        ];
      }

      // Prevent direct updates to protected fields
      const protectedFields = ['author', 'engagement', 'createdAt', '__v'];
      protectedFields.forEach((field) => delete updateData[field]);

      // Use findByIdAndUpdate to trigger pre-update middleware
      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('author', 'name email avatar')
        .populate({
          path: 'foods',
          select:
            'name description imageUrl category meal ingredients nutritionalInfo allergens tags postedBy isActive',
          match: { isActive: true },
        });

      return updatedPost;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err) => err.message);
        throw new AppError(`Validation Error: ${errors.join(', ')}`, 400);
      }
      throw error;
    }
  }

  async deletePost(postId, userId, isAdmin = false) {
    try {
      const post = await Post.findById(postId);

      if (!post) {
        throw new AppError('Post not found', 404);
      }

      // Admin can delete any post, regular users can only delete their own
      if (!isAdmin && post.author.toString() !== userId.toString()) {
        throw new AppError(
          'You do not have permission to delete this post',
          403
        );
      }

      await Post.findByIdAndDelete(postId);
      return { message: 'Post deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  async getPosts(filters = {}, options = {}) {
    try {
      const {
        userId = null,
        author,
        visibility,
        hashtags,
        search,
        foodId,
      } = filters;

      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      const query = {};

      // Visibility filter with proper logic
      if (userId) {
        const user = await User.findById(userId);
        if (!user) {
          throw new AppError('User not found', 404);
        }

        const followingIds = user.following || [];

        query.$or = [
          { visibility: 'public' },
          { author: userId },
          {
            visibility: 'followers',
            author: { $in: followingIds },
          },
        ];
      } else {
        // Non-authenticated users can only see public posts
        query.visibility = 'public';
      }

      // Apply other filters
      if (author) query.author = author;

      // Override visibility if explicitly requested and user has access
      if (visibility && userId) {
        // Only allow filtering by visibility if user is authenticated
        query.visibility = visibility;
      }

      if (hashtags && hashtags.length > 0) {
        query.hashtags = { $in: hashtags.map((tag) => tag.toLowerCase()) };
      }

      if (foodId) {
        query.foods = foodId;
      }

      // Text search
      if (search) {
        query.$text = { $search: search };
      }

      // Pagination
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Execute query
      const [posts, total] = await Promise.all([
        Post.find(query)
          .populate('author', 'name email avatar')
          .populate({
            path: 'foods',
            select:
              'name description imageUrl category meal ingredients nutritionalInfo allergens tags postedBy isActive',
            match: { isActive: true },
          })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Post.countDocuments(query),
      ]);

      return {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserPosts(authorId, currentUserId = null, options = {}) {
    try {
      // Verify author exists
      const author = await User.findById(authorId);
      if (!author) {
        throw new AppError('Author not found', 404);
      }

      return await this.getPosts(
        { author: authorId, userId: currentUserId },
        options
      );
    } catch (error) {
      throw error;
    }
  }

  async getFeedPosts(userId, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const followingIds = user.following || [];

      const query = {
        $or: [
          { visibility: 'public' },
          {
            visibility: 'followers',
            author: { $in: [...followingIds, userId] },
          },
          { author: userId },
        ],
      };

      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [posts, total] = await Promise.all([
        Post.find(query)
          .populate('author', 'name email avatar')
          .populate({
            path: 'foods',
            select:
              'name description imageUrl category meal ingredients nutritionalInfo allergens tags postedBy isActive',
            match: { isActive: true },
          })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Post.countDocuments(query),
      ]);

      return {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async searchPosts(searchTerm, userId = null, options = {}) {
    try {
      return await this.getPosts({ search: searchTerm, userId }, options);
    } catch (error) {
      throw error;
    }
  }

  async getPostsByHashtags(hashtags, userId = null, options = {}) {
    try {
      return await this.getPosts({ hashtags, userId }, options);
    } catch (error) {
      throw error;
    }
  }

  async getPostsByFood(foodId, userId = null, options = {}) {
    try {
      // Verify food exists
      const food = await Food.findById(foodId);
      if (!food) {
        throw new AppError('Food not found', 404);
      }

      return await this.getPosts({ foodId, userId }, options);
    } catch (error) {
      throw error;
    }
  }

  async updateEngagement(postId, engagementType, increment = 1) {
    try {
      const validTypes = ['likes_count', 'comments_count', 'shares_count'];

      if (!validTypes.includes(engagementType)) {
        throw new AppError('Invalid engagement type', 400);
      }

      const updateField = `engagement.${engagementType}`;

      const post = await Post.findByIdAndUpdate(
        postId,
        { $inc: { [updateField]: increment } },
        { new: true }
      ).lean();

      if (!post) {
        throw new AppError('Post not found', 404);
      }

      return post;
    } catch (error) {
      throw error;
    }
  }

  async _validatePostData(postData) {
    const { text, foods } = postData;

    // Validate text field
    if (!text || text.trim() === '') {
      throw new AppError('Post text is required', 400);
    }

    if (text.length > 5000) {
      throw new AppError('Post text cannot exceed 5000 characters', 400);
    }

    // Validate foods array if provided
    if (foods && foods.length > 0) {
      await this._validateFoods(foods);
    }

    // Validate visibility
    if (
      postData.visibility &&
      !['public', 'followers', 'private'].includes(postData.visibility)
    ) {
      throw new AppError(
        'Visibility must be public, followers, or private',
        400
      );
    }
  }

  async _validateFoods(foodIds) {
    if (!Array.isArray(foodIds)) {
      throw new AppError('Foods must be an array', 400);
    }

    // Check if all food IDs exist and are active
    const foods = await Food.find({
      _id: { $in: foodIds },
      isActive: true,
    });

    if (foods.length !== foodIds.length) {
      throw new AppError('One or more food items not found or inactive', 400);
    }

    return foods;
  }

  async _canViewPost(post, userId) {
    if (post.visibility === 'public') return true;
    if (!userId) return false;

    const authorId = post.author._id || post.author;

    // Author can always view their own posts
    if (authorId.toString() === userId.toString()) return true;

    // Check if post is for followers and user is following
    if (post.visibility === 'followers') {
      const user = await User.findById(userId);
      if (!user) return false;

      const followingIds = (user.following || []).map((id) => id.toString());
      return followingIds.includes(authorId.toString());
    }

    // Private posts can only be viewed by author
    return false;
  }

  // Extract hashtags from text
  extractHashtags(text) {
    if (!text) return [];

    const hashtagRegex = /#[\w\u0080-\uFFFF]+/g;
    const matches = text.match(hashtagRegex);
    return matches
      ? [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))]
      : [];
  }

  // Get trending hashtags
  async getTrendingHashtags(limit = 10, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trending = await Post.aggregate([
        {
          $match: {
            visibility: 'public',
            createdAt: { $gte: startDate },
          },
        },
        { $unwind: '$hashtags' },
        {
          $group: {
            _id: '$hashtags',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);

      return trending.map((item) => ({
        hashtag: item._id,
        count: item.count,
      }));
    } catch (error) {
      throw new AppError(
        `Error getting trending hashtags: ${error.message}`,
        500
      );
    }
  }

  // Get post statistics
  async getPostStatistics(postId) {
    try {
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('Post not found', 404);
      }

      return {
        post_id: postId,
        engagement: post.engagement,
        visibility: post.visibility,
        is_edited: post.is_edited,
        created_at: post.createdAt,
        edited_at: post.edited_at,
      };
    } catch (error) {
      throw error;
    }
  }

  async likePost(postId, userId) {
    try {
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('Post not found', 404);
      }

      // Check if user already liked
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.liked_posts && user.liked_posts.includes(postId)) {
        throw new AppError('You have already liked this post', 400);
      }

      // Add to user's liked posts
      await User.findByIdAndUpdate(userId, {
        $addToSet: { liked_posts: postId },
      });

      // Increment likes count
      const updatedPost = await this.updateEngagement(postId, 'likes_count', 1);

      return {
        post_id: postId,
        likes_count: updatedPost.engagement.likes_count,
      };
    } catch (error) {
      throw error;
    }
  }

  async unlikePost(postId, userId) {
    try {
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('Post not found', 404);
      }

      // Check if user has liked
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!user.liked_posts || !user.liked_posts.includes(postId)) {
        throw new AppError('You have not liked this post', 400);
      }

      // Remove from user's liked posts
      await User.findByIdAndUpdate(userId, {
        $pull: { liked_posts: postId },
      });

      // Decrement likes count
      const updatedPost = await this.updateEngagement(
        postId,
        'likes_count',
        -1
      );

      return {
        post_id: postId,
        likes_count: updatedPost.engagement.likes_count,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PostService();
