const { catchAsync } = require('../libs/util/catchAsync');
const postService = require('../service/postService');

/**
 * @swagger
 * components:
 *   schemas:
 *     PostWithLikeStatus:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         author:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             avatar:
 *               type: string
 *         text:
 *           type: string
 *         foods:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               category:
 *                 type: string
 *               nutritionalInfo:
 *                 type: object
 *         engagement:
 *           type: object
 *           properties:
 *             likes_count:
 *               type: number
 *               example: 42
 *             comments_count:
 *               type: number
 *               example: 15
 *             shares_count:
 *               type: number
 *               example: 8
 *         visibility:
 *           type: string
 *           enum: [public, followers, private]
 *           example: public
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["vietnamese", "foodie", "homecooking"]
 *         has_liked:
 *           type: boolean
 *           description: Whether the current authenticated user has liked this post (false for unauthenticated users)
 *           example: true
 *         is_edited:
 *           type: boolean
 *           example: false
 *         edited_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         total:
 *           type: integer
 *           example: 156
 *         pages:
 *           type: integer
 *           example: 16
 */

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
 *                   $ref: '#/components/schemas/PostWithLikeStatus'
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
 *
 *   get:
 *     summary: Get all posts with filters
 *     description: Retrieve posts with pagination, filtering, and sorting options. Each post includes has_liked status. Visibility logic - Unauthenticated users only see public posts. Authenticated users see public posts, their own posts, and follower-only posts from people they follow.
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
 *                         $ref: '#/components/schemas/PostWithLikeStatus'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
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
 *     description: Retrieve detailed information of a specific post. Visibility permissions are checked - private posts only visible to author, follower posts visible to followers. Returns post with has_liked status for authenticated users.
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
 *                   $ref: '#/components/schemas/PostWithLikeStatus'
 *       403:
 *         description: No permission to view this post
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
 *                   example: "No permission to view this post"
 *       404:
 *         description: Post not found
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
 *                   example: "Post not found"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
 *
 *   put:
 *     summary: Update post
 *     description: Update post content, foods, visibility or hashtags. Only post author can update. Hashtags will be auto-extracted from text and merged with provided hashtags.
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
 *                 description: Post content text
 *               foods:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of food IDs to reference
 *               visibility:
 *                 type: string
 *                 enum: [public, followers, private]
 *                 description: Post visibility setting
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Custom hashtags (will be merged with auto-extracted ones from text)
 *           examples:
 *             update_text:
 *               summary: Update post text
 *               value:
 *                 text: "Updated my thoughts on this amazing pho! #vietnamese #updated"
 *             update_visibility:
 *               summary: Change visibility
 *               value:
 *                 visibility: "followers"
 *             full_update:
 *               summary: Update multiple fields
 *               value:
 *                 text: "Completely new post content with #newhashtags"
 *                 foods:
 *                   - "507f1f77bcf86cd799439011"
 *                 visibility: "public"
 *                 hashtags:
 *                   - "foodie"
 *                   - "dinner"
 *     responses:
 *       200:
 *         description: Post updated successfully
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
 *                   example: "Post updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/PostWithLikeStatus'
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
 *                   example: "Validation Error: Text exceeds maximum length"
 *       401:
 *         description: Authentication required
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
 *                   example: "Authentication required"
 *       403:
 *         description: No permission to update this post
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
 *                   example: "No permission to update this post"
 *       404:
 *         description: Post not found
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
 *                   example: "Post not found"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
 *
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
 *                   example: "Post deleted successfully"
 *       401:
 *         description: Authentication required
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
 *                   example: "Authentication required"
 *       403:
 *         description: No permission to delete this post
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
 *                   example: "No permission to delete this post"
 *       404:
 *         description: Post not found
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
 *                   example: "Post not found"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
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
 *     description: Retrieve all posts created by a specific user with pagination. Respects visibility rules - authenticated users see public posts, their own posts, and follower posts if they follow the author. Each post includes has_liked status for authenticated users.
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
 *         description: User posts retrieved successfully
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
 *                         $ref: '#/components/schemas/PostWithLikeStatus'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: Author not found
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
 *                   example: "Author not found"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
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
 *     description: Get personalized feed showing public posts, user's own posts (all visibility), and follower-only posts from followed users. Each post includes has_liked status for the authenticated user.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Feed posts retrieved successfully
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
 *                         $ref: '#/components/schemas/PostWithLikeStatus'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Authentication required
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
 *                   example: "Authentication required"
 *       404:
 *         description: User not found
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
 *                   example: "User not found"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
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
 *     description: Full-text search in post content and hashtags. Respects visibility rules - unauthenticated users only see public posts, authenticated users see public posts, their own posts, and follower-only posts from people they follow. Each post includes has_liked status for authenticated users.
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query text
 *         example: "pho vietnamese"
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
 *         description: Posts found successfully
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
 *                         $ref: '#/components/schemas/PostWithLikeStatus'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Search query is required
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
 *                   example: "Search query is required"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
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
 *     description: Retrieve posts containing a specific hashtag. Respects visibility rules - unauthenticated users only see public posts, authenticated users see public posts, their own posts, and follower-only posts from people they follow. Each post includes has_liked status for authenticated users.
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: hashtag
 *         required: true
 *         schema:
 *           type: string
 *         description: Hashtag (without # symbol)
 *         example: "vietnamese"
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
 *                         $ref: '#/components/schemas/PostWithLikeStatus'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
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
 *     description: Retrieve posts that reference a specific food. Respects visibility rules - unauthenticated users only see public posts, authenticated users see public posts, their own posts, and follower-only posts from people they follow. Each post includes has_liked status for authenticated users.
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *         description: Food ID
 *         example: "507f1f77bcf86cd799439011"
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
 *                         $ref: '#/components/schemas/PostWithLikeStatus'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: Food not found
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
 *                   example: "Food not found"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
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
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       hashtag:
 *                         type: string
 *                         example: "vietnamese"
 *                       count:
 *                         type: number
 *                         example: 156
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
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
 *         example: "507f1f77bcf86cd799439011"
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
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     post_id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     engagement:
 *                       type: object
 *                       properties:
 *                         likes_count:
 *                           type: number
 *                           example: 42
 *                         comments_count:
 *                           type: number
 *                           example: 15
 *                         shares_count:
 *                           type: number
 *                           example: 8
 *                     visibility:
 *                       type: string
 *                       enum: [public, followers, private]
 *                       example: "public"
 *                     is_edited:
 *                       type: boolean
 *                       example: false
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     edited_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       404:
 *         description: Post not found
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
 *                   example: "Post not found"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
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
 *         example: "507f1f77bcf86cd799439011"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Post liked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     post_id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     likes_count:
 *                       type: number
 *                       example: 43
 *       400:
 *         description: Already liked or validation error
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
 *                   example: "You have already liked this post"
 *       401:
 *         description: Authentication required
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
 *                   example: "Authentication required"
 *       404:
 *         description: Post not found
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
 *                   example: "Post not found"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
 *
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
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Post unliked successfully
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
 *                   example: "Post unliked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     post_id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     likes_count:
 *                       type: number
 *                       example: 41
 *       400:
 *         description: Not liked yet or validation error
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
 *                   example: "You have not liked this post yet"
 *       401:
 *         description: Authentication required
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
 *                   example: "Authentication required"
 *       404:
 *         description: Post not found
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
 *                   example: "Post not found"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
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
/**
 * @swagger
 * /api/v1/posts/{postId}/likes:
 *   get:
 *     summary: Get users who liked a post
 *     description: Retrieve a paginated list of users who have liked a specific post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *         example: "507f1f77bcf86cd799439011"
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
 *           default: 20
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439012"
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           avatar:
 *                             type: string
 *                             example: "https://example.com/avatar.jpg"
 *                           liked_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 42
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       404:
 *         description: Post not found
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
 *                   example: "Post not found"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
 */
const getPostLikes = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const { page, limit } = req.query;

  const options = {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
  };

  const result = await postService.getPostLikes(postId, options);

  res.status(200).json({
    success: true,
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
  getPostLikes,
};
