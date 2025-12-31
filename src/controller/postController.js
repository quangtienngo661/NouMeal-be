const { catchAsync } = require('../libs/util/catchAsync');
const postService = require('../service/postService');

/**
 * @swagger
 * /api/v1/posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a food review, recipe, or general post
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
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of image URLs
 *               food_review:
 *                 type: object
 *                 description: Required when post_type is food_review
 *                 properties:
 *                   dish_name:
 *                     type: string
 *                   calories:
 *                     type: number
 *                   protein:
 *                     type: number
 *                   carbohydrates:
 *                     type: number
 *                   fat:
 *                     type: number
 *                   fiber:
 *                     type: number
 *                   rating:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
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
 *           examples:
 *             foodReview:
 *               summary: Create food review
 *               value:
 *                 post_type: "food_review"
 *                 text: "Amazing pho! The broth is so flavorful and the meat is tender."
 *                 images:
 *                   - "https://example.com/pho1.jpg"
 *                   - "https://example.com/pho2.jpg"
 *                 food_review:
 *                   dish_name: "Phở Bò"
 *                   calories: 450
 *                   protein: 25
 *                   carbohydrates: 60
 *                   fat: 10
 *                   fiber: 3
 *                   rating: 5
 *                   tags: ["vietnamese", "pho", "breakfast", "beef"]
 *                 visibility: "public"
 *             recipe:
 *               summary: Create recipe post
 *               value:
 *                 post_type: "recipe"
 *                 text: "My secret pho recipe that's been in my family for generations!"
 *                 images:
 *                   - "https://example.com/recipe-cover.jpg"
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
 *                 text: "Had an amazing dinner with friends tonight! 🍜"
 *                 images:
 *                   - "https://example.com/dinner.jpg"
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
 *                     text:
 *                       type: string
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                     food_review:
 *                       type: object
 *                     recipe:
 *                       type: object
 *                     engagement:
 *                       type: object
 *                     visibility:
 *                       type: string
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
 *                   example: "Validation error occurred"
 *                 error:
 *                   type: object
 *                   properties:
 *                     details:
 *                       type: string
 *                       example: "Post text is required"
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
 *     description: Retrieve posts with pagination, filtering, and sorting options
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
 *         description: Filter by visibility
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by food review tags (can be multiple)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in post text, recipe title, ingredients, and dish names
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Minimum rating filter (for food reviews)
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Maximum rating filter (for food reviews)
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *         description: Filter by recipe difficulty
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
 *                         properties:
 *                           _id:
 *                             type: string
 *                           post_type:
 *                             type: string
 *                           author:
 *                             type: object
 *                           text:
 *                             type: string
 *                           images:
 *                             type: array
 *                             items:
 *                               type: string
 *                           food_review:
 *                             type: object
 *                           recipe:
 *                             type: object
 *                           engagement:
 *                             type: object
 *                           visibility:
 *                             type: string
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

const getPosts = catchAsync(async (req, res, next) => {
  const {
    post_type,
    author,
    visibility,
    tags,
    search,
    minRating,
    maxRating,
    difficulty,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const userId = req.user?._id;

  const filters = {
    userId,
    post_type,
    author,
    visibility,
    tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
    search,
    minRating: minRating ? parseFloat(minRating) : undefined,
    maxRating: maxRating ? parseFloat(maxRating) : undefined,
    difficulty,
  };

  const options = {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
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
 *     description: Retrieve detailed information of a specific post
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
 *                     post_type:
 *                       type: string
 *                       enum: [food_review, recipe, general]
 *                     author:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                     text:
 *                       type: string
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                     food_review:
 *                       type: object
 *                       properties:
 *                         dish_name:
 *                           type: string
 *                         calories:
 *                           type: number
 *                         protein:
 *                           type: number
 *                         carbohydrates:
 *                           type: number
 *                         fat:
 *                           type: number
 *                         fiber:
 *                           type: number
 *                         rating:
 *                           type: number
 *                         tags:
 *                           type: array
 *                           items:
 *                             type: string
 *                     recipe:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         ingredients:
 *                           type: array
 *                           items:
 *                             type: object
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
 *                     createdAt:
 *                       type: string
 *                     updatedAt:
 *                       type: string
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
 *   put:
 *     summary: Update a post
 *     description: Update post content (only author can update)
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
 *                 description: Updated post text
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Updated array of image URLs
 *               food_review:
 *                 type: object
 *                 description: Update food review data
 *                 properties:
 *                   dish_name:
 *                     type: string
 *                   calories:
 *                     type: number
 *                   protein:
 *                     type: number
 *                   carbohydrates:
 *                     type: number
 *                   fat:
 *                     type: number
 *                   fiber:
 *                     type: number
 *                   rating:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *               recipe:
 *                 type: object
 *                 description: Update recipe data
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
 *                   servings:
 *                     type: number
 *                   difficulty:
 *                     type: string
 *                     enum: [easy, medium, hard]
 *               visibility:
 *                 type: string
 *                 enum: [public, followers, private]
 *           examples:
 *             updateText:
 *               summary: Update post text and images
 *               value:
 *                 text: "Updated: This pho is even better than I remembered!"
 *                 images:
 *                   - "https://example.com/new_photo1.jpg"
 *                   - "https://example.com/new_photo2.jpg"
 *             updateFoodReview:
 *               summary: Update food review
 *               value:
 *                 text: "Corrected review after recalculating nutrition"
 *                 food_review:
 *                   dish_name: "Phở Bò Đặc Biệt"
 *                   calories: 480
 *                   rating: 4.5
 *                   tags: ["vietnamese", "pho", "beef", "comfort-food"]
 *             updateRecipe:
 *               summary: Update recipe
 *               value:
 *                 text: "Updated recipe with better instructions"
 *                 recipe:
 *                   title: "Authentic Vietnamese Pho (Updated)"
 *                   steps:
 *                     - "Blanch beef bones for 10 minutes instead of 5"
 *                     - "Roast spices until very fragrant"
 *                     - "Simmer for 12 hours for best results"
 *                   cooking_time: 720
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
 *                   type: object
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
 *                   example: "Validation error occurred"
 *                 error:
 *                   type: object
 *                   properties:
 *                     details:
 *                       type: string
 *                       example: "Cannot change post type after creation"
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
 *         description: Not authorized to update this post
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
 *                   example: "You do not have permission to update this post"
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
 *   delete:
 *     summary: Delete a post
 *     description: Delete a post (only author can delete)
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
 *         description: Not authorized to delete this post
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
 *                   example: "You do not have permission to delete this post"
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

const deletePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;

  await postService.deletePost(postId, userId);

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
 *     description: Retrieve all posts created by a specific user with pagination
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
 *                   example: "Error getting user posts: ..."
 */
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
 *     description: Get personalized feed (public posts + user's own posts + followed users' posts)
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
 *                   example: "Error getting feed posts: ..."
 */
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
 *     description: Search posts by text in content, recipe title, ingredients, food name
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
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
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
 *                   example: "Error searching posts: ..."
 */
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
 * /api/v1/posts/tags:
 *   get:
 *     summary: Get posts by tags
 *     description: Get food review posts filtered by tags
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: tags
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Tags to filter by (can be multiple)
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
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       400:
 *         description: Tags parameter is required
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
 *                   example: "Tags parameter is required"
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
 *                   example: "Error getting posts by tags: ..."
 */
const getPostsByTags = catchAsync(async (req, res, next) => {
  const { tags, page, limit, sortBy, sortOrder } = req.query;

  if (!tags) {
    return res.status(400).json({
      success: false,
      message: 'Tags parameter is required',
    });
  }

  const userId = req.user?._id;
  const tagsArray = Array.isArray(tags) ? tags : [tags];

  const options = {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
  };

  const result = await postService.getPostsByTags(tagsArray, userId, options);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/posts/{postId}/like:
 *   post:
 *     summary: Like a post
 *     description: Increment the likes count of a post
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
 *                     engagement:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
const likePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;

  const post = await postService.updateEngagement(postId, 'likes_count', 1);

  res.status(200).json({
    success: true,
    message: 'Post liked successfully',
    data: { engagement: post.engagement },
  });
});

/**
 * @swagger
 * /api/v1/posts/{postId}/unlike:
 *   post:
 *     summary: Unlike a post
 *     description: Decrement the likes count of a post
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
 *                     engagement:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
const unlikePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;

  const post = await postService.updateEngagement(postId, 'likes_count', -1);

  res.status(200).json({
    success: true,
    message: 'Post unliked successfully',
    data: { engagement: post.engagement },
  });
});

/**
 * @swagger
 * /api/v1/posts/food-reviews/rating:
 *   get:
 *     summary: Get food reviews by rating
 *     description: Get food review posts filtered by rating range
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: minRating
 *         required: true
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         description: Minimum rating
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *           default: 5
 *         description: Maximum rating
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
 *         description: Food reviews retrieved successfully
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
 *       400:
 *         description: minRating parameter is required
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
 *                   example: "minRating parameter is required"
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
 *                   example: "Error getting food reviews by rating: ..."
 */
const getFoodReviewsByRating = catchAsync(async (req, res, next) => {
  const { minRating, maxRating, page, limit, sortBy, sortOrder } = req.query;

  if (!minRating) {
    return res.status(400).json({
      success: false,
      message: 'minRating parameter is required',
    });
  }

  const userId = req.user?._id;

  const options = {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
  };

  const result = await postService.getFoodReviewsByRating(
    parseFloat(minRating),
    maxRating ? parseFloat(maxRating) : 5,
    userId,
    options
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  createPost,
  getPostById,
  getPosts,
  getUserPosts,
  getFeedPosts,
  updatePost,
  deletePost,
  searchPosts,
  getPostsByTags,
  likePost,
  unlikePost,
  getFoodReviewsByRating,
};
