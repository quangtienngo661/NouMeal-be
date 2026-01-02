const { catchAsync } = require('../libs/util/catchAsync');
const postService = require('../service/postService');

/**
 * @swagger
 * /api/v1/posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a recipe or general post with optional food references
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
 *               - post_type
 *               - text
 *             properties:
 *               post_type:
 *                 type: string
 *                 enum: [food_review, recipe, general]
 *                 description: Type of post
 *               text:
 *                 type: string
 *                 maxLength: 5000
 *                 description: Post content text
 *               foods:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of food IDs to reference
 *               recipe:
 *                 type: object
 *                 description: Required when post_type is recipe
 *                 properties:
 *                   title:
 *                     type: string
 *                   ingredients:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         amount:
 *                           type: string
 *                         unit:
 *                           type: string
 *                   steps:
 *                     type: array
 *                     items:
 *                       type: string
 *                   cooking_time:
 *                     type: number
 *                     description: Cooking time in minutes
 *                   servings:
 *                     type: number
 *                   difficulty:
 *                     type: string
 *                     enum: [easy, medium, hard]
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
 *             recipe:
 *               summary: Create recipe post with food references
 *               value:
 *                 post_type: "recipe"
 *                 text: "My secret pho recipe! #vietnamese #homecooking"
 *                 foods:
 *                   - "507f1f77bcf86cd799439011"
 *                   - "507f1f77bcf86cd799439012"
 *                 recipe:
 *                   title: "Authentic Vietnamese Pho"
 *                   ingredients:
 *                     - name: "Beef bones"
 *                       amount: "2"
 *                       unit: "kg"
 *                     - name: "Rice noodles"
 *                       amount: "500"
 *                       unit: "g"
 *                     - name: "Star anise"
 *                       amount: "3"
 *                       unit: "pieces"
 *                   steps:
 *                     - "Blanch beef bones in boiling water for 5 minutes"
 *                     - "Roast star anise and spices until fragrant"
 *                     - "Simmer bones with spices for 8-10 hours"
 *                     - "Cook rice noodles according to package"
 *                     - "Assemble and serve hot"
 *                   cooking_time: 600
 *                   servings: 4
 *                   difficulty: "medium"
 *                 visibility: "public"
 *             general:
 *               summary: Create general post
 *               value:
 *                 post_type: "general"
 *                 text: "Had an amazing dinner with friends tonight! 🍜 #foodie #dinner"
 *                 foods:
 *                   - "507f1f77bcf86cd799439011"
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
 *                     post_type:
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
 *                     recipe:
 *                       type: object
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
 *   get:
 *     summary: Get all posts with filters
 *     description: Retrieve posts with pagination, filtering, and sorting options. Visibility logic - Unauthenticated users only see public posts. Authenticated users see public posts, their own posts, and follower-only posts from people they follow.
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: post_type
 *         schema:
 *           type: string
 *           enum: [food_review, recipe, general]
 *         description: Filter by post type
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
 *         description: Full-text search in post content, recipe titles, ingredients, and hashtags
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *         description: Filter by recipe difficulty
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
 *                           post_type:
 *                             type: string
 *                           author:
 *                             type: object
 *                           text:
 *                             type: string
 *                           foods:
 *                             type: array
 *                           recipe:
 *                             type: object
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
    post_type: req.query.post_type,
    author: req.query.author,
    visibility: req.query.visibility,
    hashtags: req.query.hashtags,
    search: req.query.search,
    difficulty: req.query.difficulty,
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
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "6957eaf02eb15e22362dc5e8"
 *                     post_type:
 *                       type: string
 *                       enum: [food_review, recipe, general]
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
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                 amount:
 *                                   type: string
 *                                 _id:
 *                                   type: string
 *                           nutritionalInfo:
 *                             type: object
 *                             properties:
 *                               calories:
 *                                 type: number
 *                               protein:
 *                                 type: number
 *                               carbohydrates:
 *                                 type: number
 *                               fat:
 *                                 type: number
 *                               fiber:
 *                                 type: number
 *                               sugar:
 *                                 type: number
 *                               sodium:
 *                                 type: number
 *                               cholesterol:
 *                                 type: number
 *                           allergens:
 *                             type: array
 *                             items:
 *                               type: string
 *                           tags:
 *                             type: array
 *                             items:
 *                               type: string
 *                           postedBy:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           instructions:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 step:
 *                                   type: number
 *                                 description:
 *                                   type: string
 *                                 _id:
 *                                   type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     recipe:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         ingredients:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               amount:
 *                                 type: string
 *                               unit:
 *                                 type: string
 *                         steps:
 *                           type: array
 *                           items:
 *                             type: string
 *                         cooking_time:
 *                           type: number
 *                         servings:
 *                           type: number
 *                         difficulty:
 *                           type: string
 *                           enum: [easy, medium, hard]
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
 *             example:
 *               success: true
 *               status: 200
 *               data:
 *                 _id: "6957eaf02eb15e22362dc5e8"
 *                 post_type: "recipe"
 *                 author:
 *                   _id: "69468379bd837158c62940ab"
 *                   name: "John Doe"
 *                   email: "john@example.com"
 *                   avatar: "https://example.com/avatar.jpg"
 *                 text: "Delicious oatmeal recipe #healthy #breakfast"
 *                 foods:
 *                   - _id: "6957eaf02eb15e22362dc5e8"
 *                     name: "Oatmeal with Berries"
 *                     description: "Healthy oatmeal topped with fresh berries."
 *                     imageUrl: "https://cdn.example.com/images/oatmeal-berries.jpg"
 *                     category: "grains"
 *                     meal: "breakfast"
 *                     ingredients:
 *                       - name: "Oats"
 *                         amount: "1 cup"
 *                         _id: "6957eaf02eb15e22362dc5eb"
 *                     nutritionalInfo:
 *                       calories: 350
 *                       protein: 35
 *                       carbohydrates: 12
 *                       fat: 15
 *                       fiber: 5
 *                       sugar: 4
 *                       sodium: 420
 *                       cholesterol: 75
 *                     allergens: ["peanuts"]
 *                     tags: ["healthy"]
 *                     postedBy: "69468379bd837158c62940ab"
 *                     isActive: true
 *                     instructions:
 *                       - step: 1
 *                         description: "Boil oats with milk for 5 minutes."
 *                         _id: "6957eaf02eb15e22362dc5e9"
 *                       - step: 2
 *                         description: "Top with fresh berries and honey."
 *                         _id: "6957eaf02eb15e22362dc5ea"
 *                     createdAt: "2026-01-02T15:57:36.856Z"
 *                     updatedAt: "2026-01-02T15:57:36.856Z"
 *                 recipe:
 *                   title: "Quick Oatmeal Breakfast"
 *                   ingredients:
 *                     - name: "Oats"
 *                       amount: "1"
 *                       unit: "cup"
 *                     - name: "Berries"
 *                       amount: "100"
 *                       unit: "g"
 *                   steps:
 *                     - "Boil oats with milk for 5 minutes"
 *                     - "Top with fresh berries"
 *                   cooking_time: 10
 *                   servings: 1
 *                   difficulty: "easy"
 *                 engagement:
 *                   likes_count: 45
 *                   comments_count: 12
 *                   shares_count: 8
 *                 visibility: "public"
 *                 hashtags: ["healthy", "breakfast"]
 *                 is_edited: false
 *                 createdAt: "2026-01-02T15:57:36.856Z"
 *                 updatedAt: "2026-01-02T15:57:36.856Z"
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
 *                 status:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: "You do not have permission to view this post"
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
 *                 status:
 *                   type: integer
 *                   example: 404
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
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *
 * /api/v1/posts:
 *   get:
 *     summary: Get all posts with filters
 *     description: Retrieve posts with pagination, filtering, and sorting options.
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: post_type
 *         schema:
 *           type: string
 *           enum: [food_review, recipe, general]
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
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       nutritionalInfo:
 *                         type: object
 *                       # ... other fields
 *                 meta:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     totalItems:
 *                       type: integer
 *                       example: 1
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 10
 *             example:
 *               success: true
 *               status: 200
 *               data:
 *                 - nutritionalInfo:
 *                     calories: 350
 *                     protein: 35
 *                     carbohydrates: 12
 *                     fat: 15
 *                     fiber: 5
 *                     sugar: 4
 *                     sodium: 420
 *                     cholesterol: 75
 *                   _id: "6957eaf02eb15e22362dc5e8"
 *                   name: "Oatmeal with Berries"
 *                   description: "Healthy oatmeal topped with fresh berries."
 *                   postedBy: "69468379bd837158c62940ab"
 *                   instructions:
 *                     - step: 1
 *                       description: "Boil oats with milk for 5 minutes."
 *                       _id: "6957eaf02eb15e22362dc5e9"
 *                     - step: 2
 *                       description: "Top with fresh berries and honey."
 *                       _id: "6957eaf02eb15e22362dc5ea"
 *                   imageUrl: "https://cdn.example.com/images/oatmeal-berries.jpg"
 *                   category: "grains"
 *                   meal: "breakfast"
 *                   ingredients:
 *                     - name: "Oats"
 *                       amount: "1 cup"
 *                       _id: "6957eaf02eb15e22362dc5eb"
 *                   allergens: ["peanuts"]
 *                   isActive: true
 *                   tags: ["string"]
 *                   createdAt: "2026-01-02T15:57:36.856Z"
 *                   updatedAt: "2026-01-02T15:57:36.856Z"
 *               meta:
 *                 currentPage: 1
 *                 totalPages: 1
 *                 totalItems: 1
 *                 itemsPerPage: 10
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
 *                           post_type:
 *                             type: string
 *                           author:
 *                             type: object
 *                           text:
 *                             type: string
 *                           foods:
 *                             type: array
 *                           recipe:
 *                             type: object
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
 *                         type: object
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
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 *
 * /api/v1/posts/search:
 *   get:
 *     summary: Search posts
 *     description: Full-text search in post content, recipe titles, ingredients, and hashtags
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
 *                         type: object
 *                     pagination:
 *                       type: object
 *       400:
 *         description: Search query is required
 *       500:
 *         description: Internal server error
 *
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
 *                     pagination:
 *                       type: object
 *       500:
 *         description: Internal server error
 *
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
 *                     pagination:
 *                       type: object
 *       404:
 *         description: Food not found
 *       500:
 *         description: Internal server error
 *
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
 *                       count:
 *                         type: number
 *       500:
 *         description: Internal server error
 *
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
 *                   example: true
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Post liked successfully"
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
