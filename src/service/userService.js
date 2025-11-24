const User = require('../model/userModel');
const AppError = require('../libs/util/AppError');
const emailService = require('../libs/util/emailService');
const { nutritiousFoodConditions } = require('../libs/conditions/recommendConditions');

class UserService {
  // Register a new user
  async registerUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new AppError('User with this email already exists', 400);
      }

      // Create new user (email verification will be required)
      const newUser = await User.create({
        ...userData,
        isEmailVerified: false
      });

      // Generate email verification OTP
      const otp = newUser.setEmailVerificationOTP();
      await newUser.save({ validateBeforeSave: false });

      // Send verification email
      try {
        await emailService.sendEmailVerificationOTP(newUser.email, newUser.name, otp);
      } catch (emailError) {
        // If email fails, still return success but log the error
        console.error('Failed to send verification email:', emailError);
        // You might want to implement a retry mechanism here
      }

      // Return user without password and sensitive data
      return {
        ...newUser.getPublicProfile(),
        message: 'Registration successful! Please check your email for verification code.'
      };
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err) => err.message);
        throw new AppError(`Validation Error: ${errors.join(', ')}`, 400);
      }
      throw error;
    }
  }

  // Login user
  async loginUser(email, password) {
    try {
      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AppError(
          'Your account has been deactivated. Please contact support.',
          401
        );
      }

      // Check password
      const isPasswordCorrect = await user.comparePassword(password);
      if (!isPasswordCorrect) {
        throw new AppError('Invalid email or password', 401);
      }

      // Update last login
      user.lastLogin = new Date();
      const newUser = await user.save({ validateBeforeSave: false });

      return newUser;
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await User.findById(userId).populate('favoriteFoods');
      if (!user) {
        throw new AppError('User not found', 404);
      }
      return user;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new AppError('Invalid user ID', 400);
      }
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    try {
      // Fields that are allowed to be updated
      const allowedFields = [
        'name',
        'age',
        'gender',
        'height',
        'weight',
        'goal',
        'preferences',
        'allergies',
        'favoriteFoods',
      ];

      // Filter out non-allowed fields
      const filteredData = {};
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      // Update user
      const updatedUser = await User.findByIdAndUpdate(userId, filteredData, {
        new: true,
        runValidators: true,
      }).populate('favoriteFoods');

      if (!updatedUser) {
        throw new AppError('User not found', 404);
      }


      return updatedUser;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err) => err.message);
        throw new AppError(`Validation Error: ${errors.join(', ')}`, 400);
      }
      if (error.name === 'CastError') {
        throw new AppError('Invalid user ID', 400);
      }
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check current password
      const isCurrentPasswordCorrect =
        await user.comparePassword(currentPassword);
      if (!isCurrentPasswordCorrect) {
        throw new AppError('Current password is incorrect', 400);
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return { message: 'Password changed successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Deactivate user account
  async deactivateUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      );

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return { message: 'Account deactivated successfully' };
    } catch (error) {
      throw error;
    }
  }

  async getDailyCalorieNeeds(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const { totalCalories, macroProfile } = nutritiousFoodConditions(user);

      return {
        totalCalories,
        macroDistribution: {
          protein: Math.round(macroProfile.protein),
          carbohydrates: Math.round(macroProfile.carb),
          fat: Math.round(macroProfile.fat),
        },
      };
    }
    catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();
