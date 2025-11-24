const User = require('../../../model/userModel');
const { mockUserData, createMockUser } = require('../../helpers/mockData');
require('../../setup');

describe('User Model Tests', () => {
  describe('User Creation', () => {
    it('should create a new user with valid data', async () => {
      const user = new User(mockUserData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(mockUserData.email.toLowerCase());
      expect(savedUser.name).toBe(mockUserData.name);
      expect(savedUser.age).toBe(mockUserData.age);
      expect(savedUser.gender).toBe(mockUserData.gender);
      expect(savedUser.height).toBe(mockUserData.height);
      expect(savedUser.weight).toBe(mockUserData.weight);
      expect(savedUser.goal).toBe(mockUserData.goal);
      expect(savedUser.preferences).toEqual(mockUserData.preferences);
      expect(savedUser.allergies).toEqual(mockUserData.allergies);
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.password).not.toBe(mockUserData.password); // Should be hashed
    });

    it('should hash password before saving', async () => {
      const user = new User(mockUserData);
      await user.save();

      expect(user.password).not.toBe(mockUserData.password);
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt format
    });

    it('should convert email to lowercase', async () => {
      const user = new User({
        ...mockUserData,
        email: 'TEST@EXAMPLE.COM',
      });
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
    });

    it('should trim whitespace from fields', async () => {
      const user = new User({
        ...mockUserData,
        name: '  Test User  ',
        email: '  test@example.com  ',
      });
      const savedUser = await user.save();

      expect(savedUser.name).toBe('Test User');
      expect(savedUser.email).toBe('test@example.com');
    });

    it('should set default values', async () => {
      const user = new User(mockUserData);
      const savedUser = await user.save();

      expect(savedUser.isActive).toBe(true);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });
  });

  describe('User Validation', () => {
    it('should fail without required email', async () => {
      const user = new User({ ...mockUserData, email: undefined });

      await expect(user.save()).rejects.toThrow(/email/i);
    });

    it('should fail without required password', async () => {
      const user = new User({ ...mockUserData, password: undefined });

      await expect(user.save()).rejects.toThrow(/password/i);
    });

    it('should fail without required name', async () => {
      const user = new User({ ...mockUserData, name: undefined });

      await expect(user.save()).rejects.toThrow(/name/i);
    });

    it('should fail with invalid email format', async () => {
      const user = new User({ ...mockUserData, email: 'invalid-email' });

      await expect(user.save()).rejects.toThrow(/valid email/i);
    });

    it('should fail with password less than 6 characters', async () => {
      const user = new User({ ...mockUserData, password: '12345' });

      await expect(user.save()).rejects.toThrow(/at least 6 characters/i);
    });

    it('should fail with name exceeding 50 characters', async () => {
      const longName = 'a'.repeat(51);
      const user = new User({ ...mockUserData, name: longName });

      await expect(user.save()).rejects.toThrow(/cannot exceed 50 characters/i);
    });

    it('should fail with age less than 13', async () => {
      const user = new User({ ...mockUserData, age: 12 });

      await expect(user.save()).rejects.toThrow(/at least 13/i);
    });

    it('should fail with age greater than 120', async () => {
      const user = new User({ ...mockUserData, age: 121 });

      await expect(user.save()).rejects.toThrow(/cannot exceed 120/i);
    });

    it('should fail with invalid gender', async () => {
      const user = new User({ ...mockUserData, gender: 'invalid' });

      await expect(user.save()).rejects.toThrow(/gender/i);
    });

    it('should fail with height less than 50', async () => {
      const user = new User({ ...mockUserData, height: 49 });

      await expect(user.save()).rejects.toThrow(/at least 50/i);
    });

    it('should fail with height greater than 300', async () => {
      const user = new User({ ...mockUserData, height: 301 });

      await expect(user.save()).rejects.toThrow(/cannot exceed 300/i);
    });

    it('should fail with weight less than 20', async () => {
      const user = new User({ ...mockUserData, weight: 19 });

      await expect(user.save()).rejects.toThrow(/at least 20/i);
    });

    it('should fail with weight greater than 500', async () => {
      const user = new User({ ...mockUserData, weight: 501 });

      await expect(user.save()).rejects.toThrow(/cannot exceed 500/i);
    });

    it('should fail with invalid goal', async () => {
      const user = new User({ ...mockUserData, goal: 'invalid_goal' });

      await expect(user.save()).rejects.toThrow(/goal/i);
    });

    it('should succeed with all valid goals', async () => {
      const validGoals = [
        'lose_weight',
        'maintain_weight',
        'gain_weight',
        'build_muscle',
        'improve_health',
      ];

      for (const goal of validGoals) {
        const user = new User({
          ...mockUserData,
          email: `test-${goal}@example.com`,
          goal,
        });
        const savedUser = await user.save();
        expect(savedUser.goal).toBe(goal);
      }
    });

    it('should enforce unique email constraint', async () => {
      const user1 = new User(mockUserData);
      await user1.save();

      const user2 = new User(mockUserData);
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('User Instance Methods', () => {
    describe('comparePassword', () => {
      it('should return true for correct password', async () => {
        const user = new User(mockUserData);
        await user.save();

        const isMatch = await user.comparePassword('Password123');
        expect(isMatch).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        const user = new User(mockUserData);
        await user.save();

        const isMatch = await user.comparePassword('WrongPassword');
        expect(isMatch).toBe(false);
      });

      it('should handle empty password', async () => {
        const user = new User(mockUserData);
        await user.save();

        const isMatch = await user.comparePassword('');
        expect(isMatch).toBe(false);
      });
    });

    describe('getPublicProfile', () => {
      it('should return user object without password', async () => {
        const user = new User(mockUserData);
        await user.save();

        const publicProfile = user.getPublicProfile();

        expect(publicProfile.password).toBeUndefined();
        expect(publicProfile.email).toBe(mockUserData.email);
        expect(publicProfile.name).toBe(mockUserData.name);
      });
    });
  });

  describe('User Schema Hooks', () => {
    it('should not rehash password if not modified', async () => {
      const user = new User(mockUserData);
      await user.save();
      const firstPassword = user.password;

      user.name = 'Updated Name';
      await user.save();

      expect(user.password).toBe(firstPassword);
    });

    it('should rehash password if modified', async () => {
      const user = new User(mockUserData);
      await user.save();
      const firstPassword = user.password;

      user.password = 'NewPassword123';
      await user.save();

      expect(user.password).not.toBe(firstPassword);
      expect(user.password).not.toBe('NewPassword123');
    });
  });

  describe('User JSON Transformation', () => {
    it('should exclude password and __v from JSON output', async () => {
      const user = new User(mockUserData);
      await user.save();

      const json = user.toJSON();

      expect(json.password).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.email).toBeDefined();
      expect(json._id).toBeDefined();
    });
  });

  describe('User Queries', () => {
    it('should not include password in queries by default', async () => {
      await User.create(mockUserData);

      const user = await User.findOne({ email: mockUserData.email });

      expect(user.password).toBeUndefined();
    });

    it('should include password when explicitly selected', async () => {
      await User.create(mockUserData);

      const user = await User.findOne({ email: mockUserData.email }).select(
        '+password'
      );

      expect(user.password).toBeDefined();
      expect(user.password).not.toBe(mockUserData.password); // Should be hashed
    });
  });

  describe('User Arrays', () => {
    it('should handle empty preferences array', async () => {
      const user = new User({ ...mockUserData, preferences: [] });
      const savedUser = await user.save();

      expect(savedUser.preferences).toEqual([]);
    });

    it('should handle empty allergies array', async () => {
      const user = new User({ ...mockUserData, allergies: [] });
      const savedUser = await user.save();

      expect(savedUser.allergies).toEqual([]);
    });

    it('should store multiple preferences', async () => {
      const preferences = ['vegan', 'gluten-free', 'organic', 'low-sodium'];
      const user = new User({ ...mockUserData, preferences });
      const savedUser = await user.save();

      expect(savedUser.preferences).toEqual(preferences);
    });

    it('should store multiple allergies', async () => {
      const allergies = ['nuts', 'dairy', 'shellfish'];
      const user = new User({ ...mockUserData, allergies });
      const savedUser = await user.save();

      expect(savedUser.allergies).toEqual(allergies);
    });
  });

  describe('User Updates', () => {
    it('should update user fields correctly', async () => {
      const user = new User(mockUserData);
      await user.save();

      user.name = 'Updated Name';
      user.weight = 75;
      user.goal = 'lose_weight';
      await user.save();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.weight).toBe(75);
      expect(updatedUser.goal).toBe('lose_weight');
    });

    it('should update timestamps on modification', async () => {
      const user = new User(mockUserData);
      await user.save();
      const originalUpdatedAt = user.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      user.name = 'Updated Name';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe('User Deletion', () => {
    it('should delete user successfully', async () => {
      const user = new User(mockUserData);
      await user.save();

      await User.findByIdAndDelete(user._id);

      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });
  });
});
