const { catchAsync } = require('../libs/util/catchAsync');
const postService = require('../service/postService');

/**
 * @swagger
 * /api/v1/posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a post with text content and optional food references
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 5000
 *                 description: Post content text
 *               foods:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of food IDs to reference
 *               visibility:
 *                 type: string
 *                 enum: [public, followers, private]
 *                 default: public
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Custom hashtags (will be merged with auto-extracted ones from text)
 *           examples:
 *             with_foods:
 *               summary: Create post with food references
 *               value:
 *                 text: "Had an amazing pho today! #vietnamese #homecooking"
 *                 foods:
 *                   - "507f1f77bcf86cd799439011"
 *                   - "507f1f77bcf86cd799439012"
 *                 visibility: "public"
 *             simple:
 *               summary: Create simple post
 *               value:
 *                 text: "Had an amazing dinner with friends tonight! 🍜 #foodie #dinner"
 *                 visibility: "public"
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Post created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     author:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                     text:
 *                       type: string
 *                     foods:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           imageUrl:
 *                             type: string
 *                           category:
 *                             type: string
 *                           nutritionalInfo:
 *                             type: object
 *                     engagement:
 *                       type: object
 *                       properties:
 *                         likes_count:
 *                           type: number
 *                         comments_count:
 *                           type: number
 *                         shares_count:
 *                           type: number
 *                     visibility:
 *                       type: string
 *                     hashtags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     is_edited:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation Error: Post text is required"
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Get all posts with filters
 *     description: Retrieve posts with pagination, filtering, and sorting options. Visibility logic - Unauthenticated users only see public posts. Authenticated users see public posts, their own posts, and follower-only posts from people they follow.
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter by author ID
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: string
 *           enum: [public, followers, private]
 *         description: Filter by visibility (requires authentication)
 *       - in: query
 *         name: hashtags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by hashtags (e.g., ?hashtags=vietnamese&hashtags=pho)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search in post content and hashtags
 *       - in: query
 *         name: foodId
 *         schema:
 *           type: string
 *         description: Filter posts that reference a specific food
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field (e.g., createdAt, updatedAt)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           author:
 *                             type: object
 *                           text:
 *                             type: string
 *                           foods:
 *                             type: array
 *                           engagement:
 *                             type: object
 *                           visibility:
 *                             type: string
 *                           hashtags:
 *                             type: array
 *                           createdAt:
 *                             type: string
 *                           updatedAt:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       500:
 *         description: Internal server error
 */

// Create a new post
const createPost = catchAsync(async (req, res, next) => {
  const postData = {
    ...req.body,
    author: req.user._id,
  };

  const post = await postService.createPost(postData);

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    data: post,
  });
});

// Get all posts with filters
const getPosts = catchAsync(async (req, res, next) => {
  const filters = {
    userId: req.user?._id,
    author: req.query.author,
    visibility: req.query.visibility,
    hashtags: req.query.hashtags,
    search: req.query.search,
    foodId: req.query.foodId,
  };

  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    sortBy: req.query.sortBy || 'createdAt',
    sortOrder: req.query.sortOrder || 'desc',
  };

  const result = await postService.getPosts(filters, options);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/posts/{postId}:
 *   get:
 *     summary: Get post by ID
 *     description: Retrieve detailed information of a specific post. Visibility permissions are checked - private posts only visible to author, follower posts visible to followers.
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     author:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                     text:
 *                       type: string
 *                     foods:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           imageUrl:
 *                             type: string
 *                           category:
 *                             type: string
 *                           meal:
 *                             type: string
 *                           ingredients:
 *                             type: array
 *                           nutritionalInfo:
 *                             type: object
 *                           allergens:
 *                             type: array
 *                           tags:
 *                             type: array
 *                           isActive:
 *                             type: boolean
 *                     engagement:
 *                       type: object
 *                       properties:
 *                         likes_count:
 *                           type: number
 *                         comments_count:
 *                           type: number
 *                         shares_count:
 *                           type: number
 *                     visibility:
 *                       type: string
 *                       enum: [public, followers, private]
 *                     hashtags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     is_edited:
 *                       type: boolean
 *                     edited_at:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: No permission to view this post
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update post
 *     description: Update post content, foods, visibility or hashtags. Only post author can update.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 5000
 *               foods:
 *                 type: array
 *                 items:
 *                   type: string
 *               visibility:
 *                 type: string
 *                 enum: [public, followers, private]
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: No permission to update this post
 *       404:
 *         description: Post not found
 *   delete:
 *     summary: Delete post
 *     description: Delete a post. Only post author or admin can delete.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       403:
 *         description: No permission to delete this post
 *       404:
 *         description: Post not found
 */

const getPostById = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user?._id;

  const post = await postService.getPostById(postId, userId);

  res.status(200).json({
    success: true,
    data: post,
  });
});

// Update post
const updatePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;
  const updateData = req.body;

  const post = await postService.updatePost(postId, userId, updateData);

  res.status(200).json({
    success: true,
    message: 'Post updated successfully',
    data: post,
  });
});

// Delete post
const deletePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;
  const isAdmin = req.user.role === 'admin';

  await postService.deletePost(postId, userId, isAdmin);

  res.status(200).json({
    success: true,
    message: 'Post deleted successfully',
  });
});

/**
 * @swagger
 * /api/v1/posts/user/{authorId}:
 *   get:
 *     summary: Get posts by specific user
 *     description: Retrieve all posts created by a specific user with pagination. Respects visibility rules - authenticated users see public posts, their own posts, and follower posts if they follow the author.
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Author user ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: User posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                     pagination:
 *                       type: object
 *       404:
 *         description: Author not found
 *       500:
 *         description: Internal server error
 */

// Get posts by specific user
const getUserPosts = catchAsync(async (req, res, next) => {
  const { authorId } = req.params;
  const currentUserId = req.user?._id;
  const { page, limit, sortBy, sortOrder } = req.query;

  const options = {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
  };

  const result = await postService.getUserPosts(
    authorId,
    currentUserId,
    options
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/posts/feed:
 *   get:
 *     summary: Get feed posts
 *     description: Get personalized feed showing public posts, user's own posts (all visibility), and follower-only posts from followed users
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Feed posts retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

// Get feed posts
const getFeedPosts = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { page, limit, sortBy, sortOrder } = req.query;

  const options = {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
  };

  const result = await postService.getFeedPosts(userId, options);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/posts/search:
 *   get:
 *     summary: Search posts
 *     description: Full-text search in post content and hashtags
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query text
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Posts found successfully
 *       400:
 *         description: Search query is required
 *       500:
 *         description: Internal server error
 */

// Search posts
const searchPosts = catchAsync(async (req, res, next) => {
  const { q, page, limit, sortBy, sortOrder } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required',
    });
  }

  const userId = req.user?._id;

  const options = {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
  };

  const result = await postService.searchPosts(q, userId, options);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/posts/hashtag/{hashtag}:
 *   get:
 *     summary: Get posts by hashtag
 *     description: Retrieve posts containing a specific hashtag
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: hashtag
 *         required: true
 *         schema:
 *           type: string
 *         description: Hashtag (without # symbol)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *       500:
 *         description: Internal server error
 */

// Get posts by hashtag
const getPostsByHashtag = catchAsync(async (req, res, next) => {
  const { hashtag } = req.params;
  const { page, limit, sortBy, sortOrder } = req.query;
  const userId = req.user?._id;

  const options = {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
  };

  const result = await postService.getPostsByHashtags(
    [hashtag],
    userId,
    options
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/posts/food/{foodId}:
 *   get:
 *     summary: Get posts by food
 *     description: Retrieve posts that reference a specific food
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *         description: Food ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *       404:
 *         description: Food not found
 *       500:
 *         description: Internal server error
 */

// Get posts by food
const getPostsByFood = catchAsync(async (req, res, next) => {
  const { foodId } = req.params;
  const { page, limit, sortBy, sortOrder } = req.query;
  const userId = req.user?._id;

  const options = {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
  };

  const result = await postService.getPostsByFood(foodId, userId, options);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/posts/trending/hashtags:
 *   get:
 *     summary: Get trending hashtags
 *     description: Retrieve most popular hashtags from recent public posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of hashtags to return
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Trending hashtags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       hashtag:
 *                         type: string
 *                       count:
 *                         type: number
 *       500:
 *         description: Internal server error
 */

// Get trending hashtags
const getTrendingHashtags = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const days = parseInt(req.query.days) || 7;

  const hashtags = await postService.getTrendingHashtags(limit, days);

  res.status(200).json({
    success: true,
    data: hashtags,
  });
});

/**
 * @swagger
 * /api/v1/posts/{postId}/statistics:
 *   get:
 *     summary: Get post statistics
 *     description: Retrieve engagement metrics and metadata for a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     post_id:
 *                       type: string
 *                     engagement:
 *                       type: object
 *                       properties:
 *                         likes_count:
 *                           type: number
 *                         comments_count:
 *                           type: number
 *                         shares_count:
 *                           type: number
 *                     visibility:
 *                       type: string
 *                     is_edited:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *                     edited_at:
 *                       type: string
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */

// Get post statistics
const getPostStatistics = catchAsync(async (req, res, next) => {
  const { postId } = req.params;

  const statistics = await postService.getPostStatistics(postId);

  res.status(200).json({
    success: true,
    data: statistics,
  });
});

/**
 * @swagger
 * /api/v1/posts/{postId}/like:
 *   post:
 *     summary: Like a post
 *     description: Add a like to a post and increment likes count
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     post_id:
 *                       type: string
 *                     likes_count:
 *                       type: number
 *       400:
 *         description: Already liked or validation error
 *       404:
 *         description: Post not found
 *       401:
 *         description: Authentication required
 *   delete:
 *     summary: Unlike a post
 *     description: Remove a like from a post and decrement likes count
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post unliked successfully
 *       400:
 *         description: Not liked yet or validation error
 *       404:
 *         description: Post not found
 *       401:
 *         description: Authentication required
 */

// Like a post
const likePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const result = await postService.likePost(postId, userId);

  res.status(200).json({
    success: true,
    message: 'Post liked successfully',
    data: result,
  });
});

// Unlike a post
const unlikePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const result = await postService.unlikePost(postId, userId);

  res.status(200).json({
    success: true,
    message: 'Post unliked successfully',
    data: result,
  });
});

module.exports = {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  getUserPosts,
  getFeedPosts,
  searchPosts,
  getPostsByHashtag,
  getPostsByFood,
  getTrendingHashtags,
  getPostStatistics,
  likePost,
  unlikePost,
};
