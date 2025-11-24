const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  updateProfile,
  getUserById,
  getProfile,
} = require('../controller/profileController');
const { handleValidationErrors } = require('../middleware/validator');
const { validateProfileUpdate } = require('../validation/profileValidation');

// Profile management routes
router.get('/', authenticate, getProfile);
router.patch(
  '/',
  authenticate,
  validateProfileUpdate,
  handleValidationErrors,
  updateProfile
);

module.exports = router;
