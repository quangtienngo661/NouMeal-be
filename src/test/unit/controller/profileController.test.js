const { updateProfile, getUserById } = require('../../../controller/profileController');
const userService = require('../../../service/userService');

jest.mock('../../../service/userService');

describe('ProfileController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      user: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      ok: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      req.user = { _id: '507f1f77bcf86cd799439011' };
      req.body = {
        name: 'Updated Name',
        age: 26,
        weight: 72,
        goal: 'build_muscle',
        preferences: ['vegetarian', 'high_protein'],
      };

      const mockUpdatedUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Updated Name',
        age: 26,
        weight: 72,
        goal: 'build_muscle',
        preferences: ['vegetarian', 'high_protein'],
      };

      userService.updateUserProfile.mockResolvedValue(mockUpdatedUser);

      await updateProfile(req, res, next);

      expect(userService.updateUserProfile).toHaveBeenCalledWith(req.user._id, req.body);
      expect(res.ok).toHaveBeenCalledWith(mockUpdatedUser, 'Profile updated successfully', 200);
    });

    // it('should handle profile update errors', async () => {
    //   req.user = { _id: '507f1f77bcf86cd799439011' };
    //   req.body = {
    //     name: 'Updated Name',
    //     age: 15, // Invalid age
    //   };

    //   const error = new Error('Validation error');
    //   userService.updateUserProfile.mockRejectedValue(error);

    //   await updateProfile(req, res, next);

    //   expect(userService.updateUserProfile).toHaveBeenCalled();
    //   expect(next).toHaveBeenCalledWith(error);
    // });

    // it('should handle user not found error', async () => {
    //   req.user = { _id: 'nonexistent' };
    //   req.body = { name: 'Updated Name' };

    //   const error = new Error('User not found');
    //   userService.updateUserProfile.mockRejectedValue(error);

    //   await updateProfile(req, res, next);

    //   expect(userService.updateUserProfile).toHaveBeenCalled();
    //   expect(next).toHaveBeenCalledWith(error);
    // });
  });

  describe('getUserById', () => {
    it('should get user by ID successfully', async () => {
      req.params = { userId: '507f1f77bcf86cd799439011' };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        age: 25,
        gender: 'male',
        height: 175,
        weight: 70,
        goal: 'build_muscle',
        preferences: ['vegetarian'],
        allergies: ['nuts'],
        favoriteFoods: [],
      };

      userService.getUserById.mockResolvedValue(mockUser);

      await getUserById(req, res, next);

      expect(userService.getUserById).toHaveBeenCalledWith(req.params.userId);
      expect(res.ok).toHaveBeenCalledWith(mockUser, 'Profile retrieved successfully', 200);
    });

    // it('should handle user not found error', async () => {
    //   req.params = { userId: 'nonexistent' };

    //   const error = new Error('User not found');
    //   userService.getUserById.mockRejectedValue(error);

    //   await getUserById(req, res, next);

    //   expect(userService.getUserById).toHaveBeenCalled();
    //   expect(next).toHaveBeenCalledWith(error);
    // });

    // it('should handle invalid user ID error', async () => {
    //   req.params = { userId: 'invalidid' };

    //   const error = new Error('Invalid user ID');
    //   userService.getUserById.mockRejectedValue(error);

    //   await getUserById(req, res, next);

    //   expect(userService.getUserById).toHaveBeenCalled();
    //   expect(next).toHaveBeenCalledWith(error);
    // });
  });
});
