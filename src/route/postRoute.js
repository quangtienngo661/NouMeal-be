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
} = require('../controller/postController');

const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validator');
const {
  validateCreatePost,
  validateUpdatePost,
  validateGetFeedQuery,
} = require('../validation/postValidation');

// ==================== STATIC ROUTES (MUST BE FIRST) ====================

router.get('/feed', authenticate, validateGetFeedQuery, getFeedPosts);

router.get('/search', optionalAuth, searchPosts);

router.get('/trending/hashtags', getTrendingHashtags);

router.get('/user/:authorId', optionalAuth, getUserPosts);

router.get('/hashtag/:hashtag', optionalAuth, getPostsByHashtag);

router.get('/food/:foodId', optionalAuth, getPostsByFood);

router.post(
  '/',
  authenticate,
  validateCreatePost,
  handleValidationErrors,
  createPost
);

router.get('/', optionalAuth, getPosts);

router.get('/:postId/statistics', getPostStatistics);

// Update post
router.put(
  '/:postId',
  authenticate,
  validateUpdatePost,
  handleValidationErrors,
  updatePost
);

router.delete('/:postId', authenticate, deletePost);

router.get('/:postId', optionalAuth, getPostById);
router.post('/:postId/like', authenticate, likePost);
router.delete('/:postId/like', authenticate, unlikePost);
module.exports = router;
