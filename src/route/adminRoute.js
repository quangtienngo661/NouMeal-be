const express = require('express');
const router = express.Router();
const { authenticate, restrictTo } = require('../middleware/authMiddleware');
const { promoteToAdmin } = require('../controller/adminController');

// Promote a user to admin (admin-only)
router.post('/promote', authenticate, restrictTo('admin'), promoteToAdmin);

module.exports = router;
