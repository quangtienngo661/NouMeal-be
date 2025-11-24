const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Don't include password in queries by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [13, 'Age must be at least 13'],
      max: [120, 'Age cannot exceed 120'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: {
        values: ['male', 'female', 'other'],
        message: 'Gender must be either male, female, or other',
      },
    },
    height: {
      type: Number,
      required: [true, 'Height is required'],
      min: [50, 'Height must be at least 50 cm'],
      max: [300, 'Height cannot exceed 300 cm'],
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [20, 'Weight must be at least 20 kg'],
      max: [500, 'Weight cannot exceed 500 kg'],
    },
    activity: {
      type: String,
      required: [true, 'Activity level is required'],
      enum: {
        values: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
        message:
          'Activity level must be one of: sedentary, lightly_active, moderately_active, very_active, extra_active',
      },
    },
    goal: {
      type: String,
      required: [true, 'Goal is required'],
      enum: {
        values: [
          'lose_weight',
          'maintain_weight',
          'gain_weight',
          'build_muscle',
          'improve_health',
        ],
        message:
          'Goal must be one of: lose_weight, maintain_weight, gain_weight, build_muscle, improve_health',
      },
    },
    preferences: [
      {
        type: String,
        trim: true,
      },
    ],
    allergies: [
      {
        type: String,
        trim: true,
        enum: [
          'peanuts',
          'tree_nuts',
          'milk',
          'eggs',
          'wheat_gluten',
          'fish',
          'shellfish',
          'soy',
          'corn',
          'sesame',
          'pineapple',
          'strawberry',
          'banana',
          'tomato',
          'apple',
          'chocolate',
          'honey',
          'mustard',
          'other',
        ],
      },
    ],
    favoriteFoods: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Food', // Reference to Food model
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationOTP: {
      type: String,
      select: false,
    },
    emailVerificationOTPExpires: {
      type: Date,
      select: false,
    },
    passwordResetOTP: {
      type: String,
      select: false,
    },
    passwordResetOTPExpires: {
      type: Date,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    refreshTokenExpires: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for faster queries (removed email index since it's already unique in schema)

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash the password with cost of 12
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Generate 6-digit OTP
userSchema.methods.generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Set email verification OTP
userSchema.methods.setEmailVerificationOTP = function () {
  const otp = this.generateOTP();
  this.emailVerificationOTP = otp;
  this.emailVerificationOTPExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  return otp;
};

// Set password reset OTP
userSchema.methods.setPasswordResetOTP = function () {
  const otp = this.generateOTP();
  this.passwordResetOTP = otp;
  this.passwordResetOTPExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  return otp;
};

// Verify email verification OTP
userSchema.methods.verifyEmailOTP = function (otp) {
  return (
    this.emailVerificationOTP === otp &&
    this.emailVerificationOTPExpires > new Date()
  );
};

// Verify password reset OTP
userSchema.methods.verifyPasswordResetOTP = function (otp) {
  return (
    this.passwordResetOTP === otp &&
    this.passwordResetOTPExpires > new Date()
  );
};

// Clear email verification OTP
userSchema.methods.clearEmailVerificationOTP = function () {
  this.emailVerificationOTP = undefined;
  this.emailVerificationOTPExpires = undefined;
};

// Clear password reset OTP
userSchema.methods.clearPasswordResetOTP = function () {
  this.passwordResetOTP = undefined;
  this.passwordResetOTPExpires = undefined;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
