const { catchAsync } = require('../libs/util/catchAsync');
const commentService = require('../service/commentService');

/**
 * @swagger
 * /api/v1/comments:
 *   post:
 *     summary: Create a new comment
 *     description: Add a comment to a post or reply to another comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - post
 *               - content
 *             properties:
 *               post:
 *                 type: string
 *                 description: Post ID
 *               content:
 *                 type: object
 *                 required:
 *                   - text
 *                 properties:
 *                   text:
 *                     type: string
 *                     maxLength: 1000
 *                   media:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           enum: [image]
 *                         url:
 *                           type: string
 *                         thumbnailUrl:
 *                           type: string
 *               parent_comment:
 *                 type: string
 *                 nullable: true
 *                 description: Parent comment ID (for replies)
 *               visibility:
 *                 type: string
 *                 enum: [public, followers, private]
 *                 default: public
 *           examples:
 *             newComment:
 *               summary: Create new comment
 *               value:
 *                 post: "507f1f77bcf86cd799439011"
 *                 content:
 *                   text: "This looks delicious!"
 *                   media: []
 *                 visibility: "public"
 *             newReply:
 *               summary: Reply to a comment
 *               value:
 *                 post: "507f1f77bcf86cd799439011"
 *                 content:
 *                   text: "Thanks for the feedback!"
 *                 parent_comment: "507f1f77bcf86cd799439012"
 *                 visibility: "public"
 *     responses:
 *       201:
 *         description: Comment created successfully
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
 *                   example: "Comment created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     post:
 *                       type: string
 *                     author:
 *                       type: string
 *                     author_name:
 *                       type: string
 *                       example: "john_doe"
 *                       description: "Username of the comment author"
 *                     content:
 *                       type: object
 *                       properties:
 *                         text:
 *                           type: string
 *                         media:
 *                           type: array
 *                     parent_comment:
 *                       type: string
 *                       nullable: true
 *                     replies_count:
 *                       type: integer
 *                       example: 0
 *                     likes_count:
 *                       type: integer
 *                       example: 0
 *                     has_liked:
 *                       type: boolean
 *                       example: false
 *                     visibility:
 *                       type: string
 *                       example: "public"
 *                     is_deleted:
 *                       type: boolean
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
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
 *                       example: "Post ID is required"
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
const createComment = catchAsync(async (req, res, next) => {
  const commentData = {
    ...req.body,
    author: req.user._id,
  };

  const comment = await commentService.createComment(commentData);

  res.status(201).json({
    success: true,
    message: 'Comment created successfully',
    data: comment,
  });
});

/**
 * @swagger
 * /api/v1/comments/{commentId}:
 *   get:
 *     summary: Get comment by ID
 *     description: Retrieve detailed information of a specific comment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment retrieved successfully
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
 *                     post:
 *                       type: object
 *                     author:
 *                       type: object
 *                     author_name:
 *                       type: string
 *                       description: "Username of the comment author"
 *                     content:
 *                       type: object
 *                     parent_comment:
 *                       type: string
 *                       nullable: true
 *                     replies_count:
 *                       type: integer
 *                     likes_count:
 *                       type: integer
 *                     has_liked:
 *                       type: boolean
 *                     visibility:
 *                       type: string
 *                     is_deleted:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update a comment
 *     description: Update comment content (only author can update)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: object
 *                 properties:
 *                   text:
 *                     type: string
 *                     maxLength: 1000
 *                   media:
 *                     type: array
 *                     items:
 *                       type: object
 *               visibility:
 *                 type: string
 *                 enum: [public, followers, private]
 *           examples:
 *             updateComment:
 *               summary: Update comment content
 *               value:
 *                 content:
 *                   text: "Updated comment text"
 *                   media: []
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to update this comment
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a comment
 *     description: Soft delete a comment (only author can delete)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to delete this comment
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
const getCommentById = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  const userId = req.user ? req.user._id : null;

  const comment = await commentService.getCommentById(commentId, userId);

  res.status(200).json({
    success: true,
    data: comment,
  });
});

const updateComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;

  const updated = await commentService.updateComment(
    commentId,
    req.body,
    req.user._id
  );

  res.status(200).json({
    success: true,
    message: 'Comment updated successfully',
    data: updated,
  });
});

const deleteComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;

  const result = await commentService.deleteComment(commentId, req.user._id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * @swagger
 * /api/v1/comments/post/{postId}:
 *   get:
 *     summary: Get comments of a post
 *     description: Retrieve all comments for a specific post with pagination
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
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
 *         description: Number of comments per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
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
 *                     comments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           post:
 *                             type: string
 *                           author:
 *                             type: object
 *                           author_name:
 *                             type: string
 *                             description: "Username of the comment author"
 *                           content:
 *                             type: object
 *                           parent_comment:
 *                             type: string
 *                             nullable: true
 *                           replies_count:
 *                             type: integer
 *                           likes_count:
 *                             type: integer
 *                           has_liked:
 *                             type: boolean
 *                           visibility:
 *                             type: string
 *                           is_deleted:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
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
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
const getCommentsByPost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;

  const result = await commentService.getCommentByPost(
    postId,
    req.user ? req.user._id : null,
    {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sortBy: req.query.sortBy || 'createdAt',
      order: req.query.order || 'asc',
    }
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/comments/{commentId}/replies:
 *   get:
 *     summary: Get replies of a comment
 *     description: Retrieve all replies for a specific comment with pagination
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
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
 *         description: Number of replies per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Replies retrieved successfully
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
 *                     replies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           post:
 *                             type: string
 *                           author:
 *                             type: object
 *                           author_name:
 *                             type: string
 *                             description: "Username of the comment author"
 *                           content:
 *                             type: object
 *                           parent_comment:
 *                             type: string
 *                           replies_count:
 *                             type: integer
 *                           likes_count:
 *                             type: integer
 *                           has_liked:
 *                             type: boolean
 *                           visibility:
 *                             type: string
 *                           is_deleted:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
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
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
const getRepliesByComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  const userId = req.user ? req.user._id : null;

  const replies = await commentService.getRepliesByComment(commentId, userId, {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    sortBy: req.query.sortBy || 'createdAt',
    order: req.query.order || 'asc',
  });

  res.status(200).json({
    success: true,
    data: replies,
  });
});

/**
 * @swagger
 * /api/v1/comments/{commentId}/like:
 *   post:
 *     summary: Like a comment
 *     description: Increment the likes count of a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment liked successfully
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
 *                   example: "Comment liked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     comment_id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     likes_count:
 *                       type: integer
 *                       example: 10
 *                     has_liked:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Already liked or validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
const likeComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;

  // ✅ FIX: Truyền đầy đủ tham số userId
  const result = await commentService.likeComment(commentId, req.user._id);

  res.status(200).json({
    success: true,
    message: 'Comment liked successfully',
    data: result,
  });
});

/**
 * @swagger
 * /api/v1/comments/{commentId}/unlike:
 *   post:
 *     summary: Unlike a comment
 *     description: Decrement the likes count of a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment unliked successfully
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
 *                   example: "Comment unliked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     comment_id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     likes_count:
 *                       type: integer
 *                       example: 9
 *                     has_liked:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Haven't liked yet or validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
const unlikeComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;

  // ✅ FIX: Truyền đầy đủ tham số userId
  const result = await commentService.unlikeComment(commentId, req.user._id);

  res.status(200).json({
    success: true,
    message: 'Comment unliked successfully',
    data: result,
  });
});

module.exports = {
  createComment,
  getCommentById,
  getCommentsByPost,
  getRepliesByComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
};
