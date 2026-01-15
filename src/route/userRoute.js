const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  changePassword,
  deactivateAccount,
  handleValidationErrors,
  followUser,
  unfollowUser,
} = require('../controller/userController');

const {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
} = require('../validation/userValidation');

const { getUserById } = require('../controller/profileController');

const { authenticate } = require('../middleware/authMiddleware');

router.post(
  '/register',
  validateRegistration,
  handleValidationErrors,
  registerUser
);
router.post('/login', validateLogin, handleValidationErrors, loginUser);
router.patch(
  '/change-password',
  authenticate,
  validatePasswordChange,
  handleValidationErrors,
  changePassword
);
router.post('/follow/:targetUserId', authenticate, followUser);
router.delete('/unfollow/:targetUserId', authenticate, unfollowUser);
router.get('/:userId', authenticate, getUserById);

module.exports = router;
