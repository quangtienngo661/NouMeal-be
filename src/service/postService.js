const Post = require('../model/postModel');
const AppError = require('../libs/util/AppError');
const User = require('../model/userModel');
const userService = require('./userService');
class PostService {
  async createPost(postData) {
    try {
      // Validate post_type và required fields
      this._validatePostData(postData);

      const post = new Post(postData);
      await post.save();

      return await this.getPostById(post._id, postData.author);
    } catch (error) {
      throw new Error(`Error creating post: ${error.message}`);
    }
  }

  async getPostById(postId, userId = null) {
    try {
      const post = await Post.findById(postId)
        .populate('author', 'username email avatar')
        .lean();

      if (!post) {
        throw new Error('Post not found');
      }

      // Check visibility permissions
      if (!this._canViewPost(post, userId)) {
        throw new Error('You do not have permission to view this post');
      }

      return post;
    } catch (error) {
      throw new Error(`Error getting post: ${error.message}`);
    }
  }

  async updatePost(postId, userId, updateData) {
    try {
      const post = await Post.findById(postId);

      if (!post) {
        throw new Error('Post not found');
      }

      // Check ownership
      if (post.author.toString() !== userId.toString()) {
        throw new Error('You do not have permission to update this post');
      }

      // Validate updated data
      if (updateData.post_type && updateData.post_type !== post.post_type) {
        throw new Error('Cannot change post type after creation');
      }

      // Update fields
      Object.keys(updateData).forEach((key) => {
        if (key !== 'author' && key !== 'engagement') {
          post[key] = updateData[key];
        }
      });

      await post.save();

      return await this.getPostById(postId, userId);
    } catch (error) {
      throw new Error(`Error updating post: ${error.message}`);
    }
  }

  async deletePost(postId, userId) {
    try {
      const post = await Post.findById(postId);

      if (!post) {
        throw new Error('Post not found');
      }

      if (post.author.toString() !== userId.toString()) {
        throw new Error('You do not have permission to delete this post');
      }

      await Post.findByIdAndDelete(postId);

      return { message: 'Post deleted successfully' };
    } catch (error) {
      throw new Error(`Error deleting post: ${error.message}`);
    }
  }

  async getPosts(filters = {}, options = {}) {
    try {
      const {
        userId = null,
        post_type,
        author,
        visibility,
        tags,
        search,
        minRating,
        maxRating,
        difficulty,
      } = filters;

      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      // Build query
      const query = {};

      // Visibility filter
      if (userId) {
        const user = await userService.getUserById(userId);
        const followingIds = await userService.getFollowingIds(userId);

        query.$or = [
          { visibility: 'public' },
          { author: userId },
          { visibility: 'followers', author: { $in: followingIds } },
        ];
      } else {
        query.visibility = 'public';
      }

      if (post_type) query.post_type = post_type;
      if (author) query.author = author;
      if (visibility && userId) query.visibility = visibility;
      if (tags && tags.length > 0) query['food_review.tags'] = { $in: tags };
      if (minRating) query['food_review.rating'] = { $gte: minRating };
      if (maxRating)
        query['food_review.rating'] = {
          ...query['food_review.rating'],
          $lte: maxRating,
        };
      if (difficulty) query['recipe.difficulty'] = difficulty;

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
          .populate('author', 'username email avatar')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Post.countDocuments(query),
      ]);

      return {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error getting posts: ${error.message}`);
    }
  }

  async getUserPosts(authorId, currentUserId = null, options = {}) {
    try {
      return await this.getPosts(
        { author: authorId, userId: currentUserId },
        options
      );
    } catch (error) {
      throw new Error(`Error getting user posts: ${error.message}`);
    }
  }

  async getFeedPosts(userId, options = {}) {
    try {
      const followingIds = await userService.getFollowingIds(userId);

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
          .populate('author', 'username email avatar')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Post.countDocuments(query),
      ]);

      return {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error getting feed posts: ${error.message}`);
    }
  }

  async searchPosts(searchTerm, userId = null, options = {}) {
    try {
      return await this.getPosts({ search: searchTerm, userId }, options);
    } catch (error) {
      throw new Error(`Error searching posts: ${error.message}`);
    }
  }

  async getPostsByTags(tags, userId = null, options = {}) {
    try {
      return await this.getPosts({ tags, userId }, options);
    } catch (error) {
      throw new Error(`Error getting posts by tags: ${error.message}`);
    }
  }

  async updateEngagement(postId, engagementType, increment = 1) {
    try {
      const validTypes = ['likes_count', 'comments_count', 'shares_count'];

      if (!validTypes.includes(engagementType)) {
        throw new Error('Invalid engagement type');
      }

      const updateField = `engagement.${engagementType}`;

      const post = await Post.findByIdAndUpdate(
        postId,
        { $inc: { [updateField]: increment } },
        { new: true }
      ).lean();

      if (!post) {
        throw new Error('Post not found');
      }

      return post;
    } catch (error) {
      throw new Error(`Error updating engagement: ${error.message}`);
    }
  }

  async getFoodReviewsByRating(
    minRating,
    maxRating = 5,
    userId = null,
    options = {}
  ) {
    try {
      return await this.getPosts(
        { post_type: 'food_review', minRating, maxRating, userId },
        options
      );
    } catch (error) {
      throw new Error(`Error getting food reviews by rating: ${error.message}`);
    }
  }

  _validatePostData(postData) {
    const { post_type, food_review, recipe } = postData;

    if (post_type === 'food_review' && !food_review) {
      throw new Error('Food review data is required for food_review posts');
    }

    if (post_type === 'recipe') {
      if (!recipe || !recipe.title) {
        throw new Error('Recipe title is required for recipe posts');
      }
    }
  }

  async _canViewPost(post, userId) {
    if (post.visibility === 'public') return true;
    if (!userId) return false;
    if (post.author._id.toString() === userId.toString()) return true;

    if (post.visibility === 'followers') {
      const followingIds = await userService.getFollowingIds(userId);
      return followingIds.includes(post.author._id.toString());
    }

    return false;
  }
}

module.exports = new PostService();
