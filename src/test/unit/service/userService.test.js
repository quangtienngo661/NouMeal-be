const User = require('../../../model/userModel');
const {
  registerUser,
  loginUser,
  getUserById,
  updateUserProfile,
  changePassword,
  deactivateUser,
} = require('../../../service/userService');
const AppError = require('../../../libs/util/AppError');

jest.mock('../../../model/userModel');

describe('UserService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // 1. Register User
  describe('registerUser', () => {
    it('should throw an error if the email already exists', async () => {
      User.findOne.mockResolvedValue({ email: 'test@example.com' });

      await expect(
        registerUser({ email: 'test@example.com', password: '123456' })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should register successfully', async () => {
      User.findOne.mockResolvedValue(null);

      const fakeUser = {
        email: 'example@gmail.com',
        name: 'John Doe',
        getPublicProfile: jest.fn().mockReturnValue({
          email: 'example@gmail.com',
          name: 'John Doe',
          age: 28,
          gender: 'male',
          height: 175,
          weight: 70,
          goal: 'maintain_weight',
          preferences: [],
          allergies: [],
          favoriteFoods: [],
          isActive: true,
          _id: '68dd3a29a8fccb04382c6145',
          createdAt: '2025-10-01T14:26:49.423Z',
          updatedAt: '2025-10-01T14:26:49.423Z',
          __v: 0,
        }),
      };

      User.create = jest.fn().mockResolvedValue(fakeUser);

      const result = await registerUser({
        email: 'example@gmail.com',
        password: 'Password123',
        name: 'John Doe',
        age: 28,
        gender: 'male',
        height: 175,
        weight: 70,
        goal: 'maintain_weight',
      });

      expect(User.findOne).toHaveBeenCalledWith({ email: 'example@gmail.com' });
      expect(User.create).toHaveBeenCalledWith({
        email: 'example@gmail.com',
        password: 'Password123',
        name: 'John Doe',
        age: 28,
        gender: 'male',
        height: 175,
        weight: 70,
        goal: 'maintain_weight',
      });
      expect(result).toEqual({
        email: 'example@gmail.com',
        name: 'John Doe',
        age: 28,
        gender: 'male',
        height: 175,
        weight: 70,
        goal: 'maintain_weight',
        preferences: [],
        allergies: [],
        favoriteFoods: [],
        isActive: true,
        _id: '68dd3a29a8fccb04382c6145',
        createdAt: '2025-10-01T14:26:49.423Z',
        updatedAt: '2025-10-01T14:26:49.423Z',
        __v: 0,
      });
      expect(fakeUser.getPublicProfile).toHaveBeenCalled();
    });

    it('should throw unexpected error', async () => {
      User.findOne.mockImplementation(() => {
        throw new AppError('Internal Server Error');
      });

      const mockUser = {
        email: 'example@gmail.com',
        password: 'Password123',
        name: 'John Doe',
        age: 28,
        gender: 'male',
        height: 175,
        weight: 70,
        goal: 'maintain_weight',
      };

      const result = registerUser(mockUser);

      await expect(result).rejects.toThrow('Internal Server Error');
      expect(User.findOne).toHaveBeenCalledWith({ email: mockUser.email });
    });
  });

  // 2. Login User
  describe('loginUser', () => {
    it('should throw error when user is invalid', async () => {
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      await expect(
        loginUser('nonexistent@example.com', 'password123')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error when account is deactivated', async () => {
      const inactiveUser = {
        email: 'test@example.com',
        isActive: false,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(inactiveUser),
      });

      const result = loginUser(inactiveUser.email, '123456');

      await expect(result).rejects.toThrow(
        'Your account has been deactivated. Please contact support.'
      );
      // The account is deactivated => comparePassword method won't be called
      // expect(inactiveUser.comparePassword).toHaveBeenCalledWith('123456');
      expect(User.findOne).toHaveBeenCalledWith({ email: inactiveUser.email });
    });

    it("should throw error when user's password is invalid", async () => {
      const invalidPasswordUser = {
        email: 'invalidUser@example.com',
        password: '123456',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(invalidPasswordUser),
      });

      const result = loginUser(
        invalidPasswordUser.email,
        invalidPasswordUser.password
      );

      await expect(result).rejects.toThrow('Invalid email or password');
      expect(User.findOne).toHaveBeenCalledWith({
        email: invalidPasswordUser.email,
      });
      expect(invalidPasswordUser.comparePassword).toHaveBeenCalledWith(
        invalidPasswordUser.password
      );
    });

    it('should login successfully', async () => {
      const fakeUser = {
        _id: '68dd3a29a8fccb04382c6145',
        email: 'validuser@example.com',
        password: '123456',
        name: 'John Doe',
        age: 28,
        gender: 'male',
        height: 175,
        weight: 70,
        goal: 'maintain_weight',
        preferences: [],
        allergies: [],
        favoriteFoods: [],
        isActive: true,
        createdAt: '2025-10-01T14:26:49.423Z',
        updatedAt: '2025-10-01T15:39:07.090Z',
        lastLogin: '2025-10-01T15:39:07.085Z',
      };

      const validUser = {
        email: 'validuser@example.com',
        password: '123456',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(fakeUser),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(validUser),
      });

      const result = await loginUser(validUser.email, validUser.password);

      expect(result).toEqual(fakeUser);
      expect(validUser.comparePassword).toHaveBeenCalledWith(
        validUser.password
      );
      expect(validUser.save).toHaveBeenCalled();
      expect(User.findOne).toHaveBeenCalledWith({ email: validUser.email });
    });

    it('should throw unexpected error', async () => {
      User.findOne.mockImplementation(() => {
        throw new AppError('Internal Server Error');
      });

      const result = loginUser('email@example.com', '123456');

      await expect(result).rejects.toThrow('Internal Server Error');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'email@example.com' });
    });
  });

  // 3. Get user by ID
  describe('getUserById', () => {
    it('should return user successfully', async () => {
      const mockUser = {
        _id: '652fcf8c8f1a2b4e12345678',
        email: 'john.doe@example.com',
        name: 'John Doe',
        age: 28,
        gender: 'male',
        height: 175,
        weight: 72,
        goal: 'build_muscle',
        preferences: ['high_protein', 'low_sugar'],
        allergies: ['peanuts'],
        favoriteFoods: [
          {
            _id: '6530a1c4b6d2e22c98765431',
            name: 'Grilled Chicken Breast',
            calories: 165,
            protein: 31,
            carbs: 0,
            fat: 3.6,
            category: 'protein',
            isHealthy: true,
          },
          {
            _id: '6530a1c4b6d2e22c98765432',
            name: 'Oatmeal with Banana',
            calories: 250,
            protein: 8,
            carbs: 45,
            fat: 4,
            category: 'carbohydrate',
            isHealthy: true,
          },
        ],
        isActive: true,
        lastLogin: new Date('2025-10-07T10:00:00Z'),
        createdAt: new Date('2025-10-01T08:00:00Z'),
        updatedAt: new Date('2025-10-07T10:05:00Z'),
      };

      const populateMock = jest.fn().mockResolvedValue(mockUser);

      User.findById.mockReturnValue({
        populate: populateMock,
      });

      const result = await getUserById(mockUser._id);
      expect(result).toEqual(mockUser);
      expect(User.findById).toHaveBeenCalled();
      expect(populateMock).toHaveBeenCalledWith('favoriteFoods');
    });

    it('should throw error when user not found', async () => {
      const nonExistedUser = {
        _id: '6530a1c4b6d2e22c98765431',
        email: 'nonexistedUser@example.com',
        favoriteFoods: [],
      };

      const populateMock = jest.fn().mockResolvedValue(null);
      User.findById.mockReturnValue({
        populate: populateMock,
      });

      const result = getUserById(nonExistedUser._id);
      await expect(result).rejects.toThrow('User not found');
      expect(populateMock).toHaveBeenCalledWith('favoriteFoods');
      expect(User.findById).toHaveBeenCalledWith(nonExistedUser._id);
    });

    it('should throw error when userId is not invalid (CastError)', async () => {
      User.findById.mockImplementation(() => {
        throw { name: 'CastError', message: 'Cast to ObjectId failed' };
      });

      await expect(getUserById('invalidId')).rejects.toThrow('Invalid user ID');
    });

    it('should throw unexpected error', async () => {
      User.findById.mockImplementation(() => {
        throw new AppError('Internal Server Error');
      });

      const result = getUserById('68dd3a29a8fccb04382c6145');

      await expect(result).rejects.toThrow('Internal Server Error');
      expect(User.findById).toHaveBeenCalledWith('68dd3a29a8fccb04382c6145');
    });
  });

  // 4. Update user profile
  describe('updateUserProfile', () => {
    it('should update user successfully', async () => {
      const updateData = {
        _id: '68dd3a29a8fccb04382c6145',
        name: 'John Doe',
      };

      const mockUpdatedUser = {
        _id: '68dd3a29a8fccb04382c6145',
        email: 'example@gmail.com',
        name: 'John Doe',
        age: 28,
        gender: 'male',
        height: 175,
        weight: 70,
        goal: 'maintain_weight',
        preferences: [],
        allergies: [],
        favoriteFoods: [],
        isActive: true,
        createdAt: '2025-10-01T14:26:49.423Z',
        updatedAt: '2025-10-02T12:33:26.526Z',
        __v: 0,
        lastLogin: '2025-10-02T12:19:15.663Z',
      };

      const populateMock = jest.fn().mockResolvedValue(mockUpdatedUser);

      User.findByIdAndUpdate.mockReturnValue({
        populate: populateMock,
      });

      const result = await updateUserProfile(mockUpdatedUser._id, {
        name: 'John Doe',
      });
      expect(result).toEqual(mockUpdatedUser);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        updateData._id,
        { name: updateData.name },
        { new: true, runValidators: true }
      );
      expect(populateMock).toHaveBeenCalledWith('favoriteFoods');
    });

    it('should throw error when user not found', async () => {
      User.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      const result = updateUserProfile('invalidId', { name: 'Invalid Name' });

      await expect(result).rejects.toThrow('User not found');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'invalidId',
        { name: 'Invalid Name' },
        { runValidators: true, new: true }
      );
    });

    it('should throw validation error', async () => {
      const badValidationData = {
        _id: '68dd3a29a8fccb04382c6145',
        name: '',
      };

      User.findByIdAndUpdate.mockImplementation(() => {
        throw new Error('Validation Error');
      });

      const result = updateUserProfile('68dd3a29a8fccb04382c6145', {
        name: badValidationData.name,
      });

      await expect(result).rejects.toThrow('Validation Error');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        '68dd3a29a8fccb04382c6145',
        { name: badValidationData.name },
        { runValidators: true, new: true }
      );
    });

    it('should throw error when the userId is invalid', async () => {
      User.findByIdAndUpdate.mockImplementation(() => {
        throw new AppError('Invalid user ID');
      });

      const mockUserData = {
        _id: 'invalidId',
        name: 'John Doe',
      };

      const result = updateUserProfile(mockUserData._id, {
        name: mockUserData.name,
      });
      await expect(result).rejects.toThrow('Invalid user ID');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'invalidId',
        { name: mockUserData.name },
        { runValidators: true, new: true }
      );
    });

    it('should ignore fields that are not allowed to be updated', async () => {
      const mockUser = {
        _id: '6530a1c4b6d2e22c98765431',
        name: 'Updated Name',
      };

      const updateData = {
        name: 'Updated Name',
        role: 'admin',
        password: 'secret123',
      };

      User.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await updateUserProfile(mockUser._id, updateData);

      expect(result).toEqual(mockUser);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        { name: 'Updated Name' },
        { runValidators: true, new: true }
      );
    });

    it('should throw unexpected error', async () => {
      User.findByIdAndUpdate.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = updateUserProfile('6530a1c4b6d2e22c98765431', {
        name: 'John Doe',
      });

      await expect(result).rejects.toThrow('Database connection failed');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        '6530a1c4b6d2e22c98765431',
        { name: 'John Doe' },
        { runValidators: true, new: true }
      );
    });
  });

  // 5. Change password
  describe('changePassword', () => {
    it('should throw error when user not found', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const result = changePassword(
        'invalidId',
        'currentPassword',
        'newPassword'
      );

      await expect(result).rejects.toThrow('User not found');
      expect(User.findById).toHaveBeenCalledWith('invalidId');
    });

    it("should throw error when user's password is invalid", async () => {
      const invalidPasswordUser = {
        _id: '68dd3a29a8fccb04382c6145',
        email: 'invalidUser@example.com',
        password: '123456',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(invalidPasswordUser),
      });

      const result = changePassword(
        invalidPasswordUser._id,
        invalidPasswordUser.password,
        'newPassword'
      );

      await expect(result).rejects.toThrow('Current password is incorrect');
      expect(User.findById).toHaveBeenCalledWith(invalidPasswordUser._id);
      expect(invalidPasswordUser.comparePassword).toHaveBeenCalledWith(
        invalidPasswordUser.password
      );
    });

    it('should change password successfully', async () => {
      const mockUserData = {
        _id: '68dd3a29a8fccb04382c6145',
        email: 'user@example.com',
        password: 'oldPassword',
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(),
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData),
      });

      // Expect is not using rejects or resolves, so the method should use async/await
      const result = await changePassword(
        mockUserData._id,
        mockUserData.password,
        'newPassword'
      );
      await expect(result).toEqual({
        message: 'Password changed successfully',
      });
      expect(User.findById).toHaveBeenCalledWith(mockUserData._id);
    });

    it('should throw unexpected error', async () => {
      User.findById.mockImplementation(() => {
        throw new Error('Unexpected Error');
      });

      const result = changePassword(
        '6530a1c4b6d2e22c98765431',
        'oldPassword',
        'newPassword'
      );

      await expect(result).rejects.toThrow('Unexpected Error');
      expect(User.findById).toHaveBeenCalledWith('6530a1c4b6d2e22c98765431');
    });
  });

  // 6. Deactivate User
  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const deactivateAccountData = {
        _id: '68dd3a29a8fccb04382c6145',
        isActive: false,
      };

      const mockUpdatedUser = {
        _id: deactivateAccountData._id,
        email: 'example@gmail.com',
        isActive: false,
        save: jest.fn(),
      };

      User.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

      const result = await deactivateUser(deactivateAccountData._id);
      expect(result).toEqual({ message: 'Account deactivated successfully' });

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        deactivateAccountData._id,
        { isActive: false },
        { new: true }
      );
    });

    it('should throw error when user not found', async () => {
      User.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = deactivateUser('someId');
      expect(result).rejects.toThrow('User not found');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'someId',
        { isActive: false },
        { new: true }
      );
    });

    it('should throw unexpected error', async () => {
      User.findByIdAndUpdate.mockImplementation(() => {
        throw new Error('Unexpected Error');
      });

      const result = deactivateUser('6530a1c4b6d2e22c98765431');

      await expect(result).rejects.toThrow('Unexpected Error');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        '6530a1c4b6d2e22c98765431',
        { isActive: false },
        { new: true }
      );
    });
  });
});
