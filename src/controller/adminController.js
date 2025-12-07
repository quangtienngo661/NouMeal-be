const User = require('../model/userModel');
const AppError = require('../libs/util/AppError');

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
  promoteToAdmin,
};
