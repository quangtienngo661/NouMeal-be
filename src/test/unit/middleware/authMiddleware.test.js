const jwt = require('jsonwebtoken');
const {
  generateToken,
  authenticate,
  restrictTo,
  createSendToken,
} = require('../../../middleware/authMiddleware');
const User = require('../../../model/userModel');
const AppError = require('../../../libs/util/AppError');
const { mockUserData, createMockObjectId } = require('../../helpers/mockData');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../../model/userModel');

describe('Auth Middleware Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-key',
      JWT_EXPIRES_IN: '7d',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = createMockObjectId();
      const mockToken = 'mock.jwt.token';

      jwt.sign.mockReturnValue(mockToken);

      const token = generateToken(userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: userId },
        'test-secret-key',
        { expiresIn: '7d' }
      );
      expect(token).toBe(mockToken);
    });

    it('should use default expiration if JWT_EXPIRES_IN not set', () => {
      delete process.env.JWT_EXPIRES_IN;
      const userId = createMockObjectId();
      const mockToken = 'mock.jwt.token';

      jwt.sign.mockReturnValue(mockToken);

      generateToken(userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: userId },
        'test-secret-key',
        { expiresIn: '7d' }
      );
    });
  });

  describe('authenticate', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {},
      };
      res = {};
      next = jest.fn();
    });

    it('should authenticate user with valid token', async () => {
      const userId = createMockObjectId();
      const mockToken = 'valid.jwt.token';
      const mockUser = {
        _id: userId,
        ...mockUserData,
        isActive: true,
      };

      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockReturnValue({ id: userId });
      User.findById.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret-key');
      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });

    it('should fail if no token provided', async () => {
      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You are not logged in! Please log in to get access.',
          statusCode: 401,
        })
      );
    });

    it('should fail with invalid token format', async () => {
      req.headers.authorization = 'InvalidToken';

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
        })
      );
    });

    it('should fail with invalid JWT token', async () => {
      const mockToken = 'invalid.jwt.token';
      req.headers.authorization = `Bearer ${mockToken}`;

      jwt.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token. Please log in again!',
          statusCode: 401,
        })
      );
    });

    it('should fail with expired token', async () => {
      const mockToken = 'expired.jwt.token';
      req.headers.authorization = `Bearer ${mockToken}`;

      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Your token has expired! Please log in again.',
          statusCode: 401,
        })
      );
    });

    it('should fail if user no longer exists', async () => {
      const userId = createMockObjectId();
      const mockToken = 'valid.jwt.token';

      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockReturnValue({ id: userId });
      User.findById.mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'The user belonging to this token does no longer exist.',
          statusCode: 401,
        })
      );
    });

    it('should fail if user is inactive', async () => {
      const userId = createMockObjectId();
      const mockToken = 'valid.jwt.token';
      const mockUser = {
        _id: userId,
        ...mockUserData,
        isActive: false,
      };

      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockReturnValue({ id: userId });
      User.findById.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Your account has been deactivated. Please contact support.',
          statusCode: 401,
        })
      );
    });

    it('should handle other JWT errors', async () => {
      const mockToken = 'error.jwt.token';
      req.headers.authorization = `Bearer ${mockToken}`;

      jwt.verify.mockImplementation(() => {
        throw new Error('Some other error');
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed',
          statusCode: 401,
        })
      );
    });
  });

  describe('restrictTo', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        user: { role: 'user' },
      };
      res = {};
      next = jest.fn();
    });

    it('should allow access for authorized role', () => {
      const middleware = restrictTo('user', 'admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access for unauthorized role', () => {
      req.user.role = 'user';
      const middleware = restrictTo('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to perform this action',
          statusCode: 403,
        })
      );
    });

    it('should allow access for multiple roles', () => {
      req.user.role = 'moderator';
      const middleware = restrictTo('user', 'moderator', 'admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('createSendToken', () => {
    let res;

    beforeEach(() => {
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        ok: jest.fn().mockReturnThis(),
      };
      jwt.sign.mockReturnValue('mock.jwt.token');
    });

    it('should create and send token with user data', () => {
      const mockUser = {
        _id: createMockObjectId(),
        ...mockUserData,
        password: 'hashedpassword',
      };

      createSendToken(mockUser, 200, res, 'Login successful');

      expect(jwt.sign).toHaveBeenCalled();
      expect(mockUser.password).toBeUndefined();
      expect(res.ok).toHaveBeenCalledWith(
        { token: 'mock.jwt.token', user: mockUser },
        'Login successful',
        200
      );
    });

    it('should use default message if not provided', () => {
      const mockUser = {
        _id: createMockObjectId(),
        email: 'test@example.com',
      };

      createSendToken(mockUser, 200, res);

      expect(res.ok).toHaveBeenCalledWith(
        { token: 'mock.jwt.token', user: mockUser },
        'Success',
        200
      );
    });

    it('should remove password from user object', () => {
      const mockUser = {
        _id: createMockObjectId(),
        email: 'test@example.com',
        password: 'shouldBeRemoved',
      };

      createSendToken(mockUser, 201, res, 'User created');

      expect(mockUser.password).toBeUndefined();
    });
  });
});
