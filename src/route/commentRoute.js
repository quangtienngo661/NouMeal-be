const express = require('express');
const router = express.Router();

// Import controllers
const {
  createComment,
  getCommentById,
  getCommentsByPost,
  getRepliesByComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
} = require('../controller/commentController');

const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validator');
const {
  validateCreateComment,
  validateUpdateComment,
  validateDeleteComment,
  validateGetComment,
  validateLikeComment,
  validateUnlikeComment,
  validateGetReplies,
} = require('../validation/commentVadiation');

// ========= COMMENT CRUD ROUTES =========

// Create comment
router.post(
  '/',
  authenticate,
  validateCreateComment,
  handleValidationErrors,
  createComment
);

// Get comments by post
router.get('/post/:postId', optionalAuth, getCommentsByPost);

// Get replies by comment
router.get(
  '/:commentId/replies',
  optionalAuth,
  validateGetReplies,
  handleValidationErrors,
  getRepliesByComment
);

// Get specific comment by ID
router.get(
  '/:commentId',
  optionalAuth,
  validateGetComment,
  handleValidationErrors,
  getCommentById
);

// Update comment
router.put(
  '/:commentId',
  authenticate,
  validateUpdateComment,
  handleValidationErrors,
  updateComment
);

// Delete comment
router.delete(
  '/:commentId',
  authenticate,
  validateDeleteComment,
  handleValidationErrors,
  deleteComment
);

// ========= COMMENT INTERACTION ROUTES =========

// Like comment
router.post(
  '/:commentId/like',
  authenticate,
  validateLikeComment,
  handleValidationErrors,
  likeComment
);

// Unlike comment
router.post(
  '/:commentId/unlike',
  authenticate,
  validateUnlikeComment,
  handleValidationErrors,
  unlikeComment
);

module.exports = router;
