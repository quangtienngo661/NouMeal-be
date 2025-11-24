const mongoose = require('mongoose');

// Mock user data
const mockUserData = {
  email: 'test@example.com',
  password: 'Password123',
  name: 'Test User',
  age: 25,
  gender: 'male',
  height: 175,
  weight: 70,
  goal: 'build_muscle',
  preferences: ['vegetarian', 'high_protein'],
  allergies: ['nuts'],
};

const mockUserData2 = {
  email: 'test2@example.com',
  password: 'Password456',
  name: 'Test User 2',
  age: 30,
  gender: 'female',
  height: 165,
  weight: 60,
  goal: 'lose_weight',
  preferences: ['low_carb'],
  allergies: [],
};

const invalidUserData = {
  email: 'invalid-email',
  password: '123', // Too short
  name: '',
  age: 10, // Too young
  gender: 'invalid',
  height: 30, // Too short
  weight: 10, // Too light
  goal: 'invalid_goal',
};

const mockUpdateData = {
  name: 'Updated Name',
  age: 26,
  weight: 72,
  goal: 'maintain_weight',
  preferences: ['vegan', 'organic'],
};

const mockPasswordChange = {
  currentPassword: 'Password123',
  newPassword: 'NewPassword456',
};

const mockLoginData = {
  email: 'test@example.com',
  password: 'Password123',
};

const createMockUser = (overrides = {}) => {
  return { ...mockUserData, ...overrides };
};

const createMockObjectId = () => {
  return new mongoose.Types.ObjectId();
};

module.exports = {
  mockUserData,
  mockUserData2,
  invalidUserData,
  mockUpdateData,
  mockPasswordChange,
  mockLoginData,
  createMockUser,
  createMockObjectId,
};
