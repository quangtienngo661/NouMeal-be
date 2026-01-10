const express = require('express');
const router = express.Router();

const {
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
} = require('../controller/postController');

const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validator');
const {
  validateCreatePost,
  validateUpdatePost,
  validateGetFeedQuery,
} = require('../validation/postValidation');

// ==================== STATIC ROUTES (HIGHEST PRIORITY) ====================

router.get('/feed', authenticate, validateGetFeedQuery, getFeedPosts);
router.get('/search', optionalAuth, searchPosts);
router.get('/trending/hashtags', getTrendingHashtags);
router.get('/user/:authorId', optionalAuth, getUserPosts);
router.get('/hashtag/:hashtag', optionalAuth, getPostsByHashtag);
router.get('/food/:foodId', optionalAuth, getPostsByFood);

// ==================== ROOT ROUTES ====================

router.post(
  '/',
  authenticate,
  validateCreatePost,
  handleValidationErrors,
  createPost
);
router.get('/', optionalAuth, getPosts);

// ==================== DYNAMIC ROUTES - SPECIFIC PATHS FIRST ====================

// Các route có path cụ thể phải đứng TRƯỚC route generic /:postId
router.get('/:postId/statistics', getPostStatistics);
router.get('/:postId/likes', getPostLikes);
router.post('/:postId/like', authenticate, likePost);
router.delete('/:postId/like', authenticate, unlikePost);

// ==================== DYNAMIC ROUTES - GENERIC :postId LAST ====================

router.get('/:postId', optionalAuth, getPostById);
router.put(
  '/:postId',
  authenticate,
  validateUpdatePost,
  handleValidationErrors,
  updatePost
);
router.delete('/:postId', authenticate, deletePost);

module.exports = router;
