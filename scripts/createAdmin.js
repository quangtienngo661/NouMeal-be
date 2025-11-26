require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/model/userModel');

async function run() {
  const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGO || 'mongodb://localhost:27017/mealgenie';
  await mongoose.connect(MONGO_URL, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });

  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node scripts/createAdmin.js <email> <password>');
    process.exit(1);
  }

  try {
    // Upsert user: if exists, update password and role, else create new
    let user = await User.findOne({ email }).select('+password');
    if (user) {
      user.password = password;
      user.role = 'admin';
      user.isEmailVerified = true;
      await user.save();
      console.log('Updated existing user to admin:', email);
    } else {
      user = new User({ email, password, name: 'Admin', age: 30, gender: 'other', height: 170, weight: 70, activity: 'sedentary', goal: 'maintain_weight', role: 'admin', isEmailVerified: true });
      await user.save();
      console.log('Created new admin user:', email);
    }
  } catch (err) {
    console.error('Error creating admin user:', err.message || err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
