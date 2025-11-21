const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || process.env.BE_PORT || 3000;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.log('🔄 Shutting down the server due to unhandled promise rejection');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.log('🔄 Shutting down the application due to uncaught exception');
  process.exit(1);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(
    `📚 API Documentation available at: http://localhost:${PORT}/api-docs`
  );
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Server accessible at: http://localhost:${PORT}`);
});

// Seed admin user on startup (non-blocking)
async function seedAdmin() {
  try {
    const User = require('./model/userModel');
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.SEED_ADMIN_PASSWORD || '123456789';
    const existing = await User.findOne({ email }).select('+password');
    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        existing.isEmailVerified = true;
        existing.isActive = true;
        existing.password = password;
        await existing.save({ validateBeforeSave: false });
        console.log(`🔧 Updated existing user to admin: ${email}`);
      } else {
        console.log(`🔐 Admin user already exists: ${email}`);
      }
      return;
    }

    const newUser = new User({
      email,
      password,
      name: 'Admin',
      age: 30,
      gender: 'other',
      height: 170,
      weight: 70,
      activity: 'sedentary',
      goal: 'maintain_weight',
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
    });
    await newUser.save();
    console.log(`✅ Created seed admin user: ${email}`);
  } catch (err) {
    console.warn('Seed admin failed:', err.message || err);
  }
}

// Run seeding after server start
seedAdmin();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});
