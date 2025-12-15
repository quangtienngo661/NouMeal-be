const User = require('../model/userModel');
const AppError = require('../libs/util/AppError');

// Get all user profiles (admin-only)
async function getAllUsers(req, res, next) {
  try {
    const { page = 1, limit = 10, role, isActive, search } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// Promote a user to admin by email or id
async function promoteToAdmin(req, res, next) {
  try {
    const { email, userId } = req.body;
    if (!email && !userId) return next(new AppError('Provide email or userId to promote', 400));

    const filter = email ? { email } : { _id: userId };
    const user = await User.findOne(filter).select('+password');
    if (!user) return next(new AppError('User not found', 404));

    if (user.role === 'admin') {
      return res.json({ success: true, message: 'User is already an admin', data: { email: user.email } });
    }

    user.role = 'admin';
    user.isEmailVerified = true;
    user.isActive = true;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'User promoted to admin', data: { email: user.email } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsers,
  promoteToAdmin,
};
