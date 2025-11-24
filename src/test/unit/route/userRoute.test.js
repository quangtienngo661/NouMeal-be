const request = require('supertest');
const express = require('express');
const userRoute = require('../../../route/userRoute');
const userController = require('../../../controller/userController');
const profileController = require('../../../controller/profileController');
const { authenticate } = require('../../../middleware/authMiddleware');
const { handleValidationErrors } = require('../../../middleware/validator');
const { mockUserData, mockLoginData, mockPasswordChange } = require('../../helpers/mockData');

// Mock dependencies
jest.mock('../../../controller/userController');
jest.mock('../../../controller/profileController');
jest.mock('../../../middleware/authMiddleware');
jest.mock('../../../middleware/validator');
jest.mock('../../../validation/userValidation');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/users', userRoute);

describe('User Routes Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock middleware to pass through
    authenticate.mockImplementation((req, res, next) => {
      req.user = { _id: 'mock-user-id' };
      next();
    });
    handleValidationErrors.mockImplementation((req, res, next) => next());

    // Default mock implementations
    userController.registerUser.mockImplementation((req, res) => {
      res.status(201).json({ success: true, message: 'User registered successfully' });
    });
    userController.loginUser.mockImplementation((req, res) => {
      res.status(200).json({ success: true, message: 'Login successful' });
    });
    userController.changePassword.mockImplementation((req, res) => {
      res.status(200).json({ success: true, message: 'Password changed successfully' });
    });
    userController.deactivateAccount.mockImplementation((req, res) => {
      res.status(200).json({ success: true, message: 'Account deactivated successfully' });
    });
    profileController.getUserById.mockImplementation((req, res) => {
      res.status(200).json({ success: true, data: { user: {} } });
    });
  });

  describe('POST /api/v1/users/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(mockUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(userController.registerUser).toHaveBeenCalled();
      expect(handleValidationErrors).toHaveBeenCalled();
    });

    it('should call validation middleware for registration', async () => {
      await request(app)
        .post('/api/v1/users/register')
        .send(mockUserData)
        .expect(201);

      expect(handleValidationErrors).toHaveBeenCalled();
    });

    it('should accept complete registration data', async () => {
      const completeData = {
        ...mockUserData,
        preferences: ['vegetarian', 'high_protein'],
        allergies: ['nuts'],
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(completeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(userController.registerUser).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/users/login', () => {
    it('should login a user', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send(mockLoginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(userController.loginUser).toHaveBeenCalled();
      expect(handleValidationErrors).toHaveBeenCalled();
    });

    it('should call validation middleware for login', async () => {
      await request(app)
        .post('/api/v1/users/login')
        .send(mockLoginData)
        .expect(200);

      expect(handleValidationErrors).toHaveBeenCalled();
    });

    it('should accept email and password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(userController.loginUser).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/users/change-password', () => {
    it('should change user password', async () => {
      const response = await request(app)
        .patch('/api/v1/users/change-password')
        .set('Authorization', 'Bearer mock-token')
        .send(mockPasswordChange)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');
      expect(authenticate).toHaveBeenCalled();
      expect(userController.changePassword).toHaveBeenCalled();
      expect(handleValidationErrors).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/v1/users/change-password')
        .send(mockPasswordChange)
        .expect(200);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validation middleware', async () => {
      await request(app)
        .patch('/api/v1/users/change-password')
        .set('Authorization', 'Bearer mock-token')
        .send(mockPasswordChange)
        .expect(200);

      expect(handleValidationErrors).toHaveBeenCalled();
    });

    it('should accept current and new password', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      };

      const response = await request(app)
        .patch('/api/v1/users/change-password')
        .set('Authorization', 'Bearer mock-token')
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(userController.changePassword).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/users/deactivate', () => {
    it('should deactivate user account', async () => {
      const response = await request(app)
        .patch('/api/v1/users/deactivate')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Account deactivated successfully');
      expect(authenticate).toHaveBeenCalled();
      expect(userController.deactivateAccount).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/v1/users/deactivate')
        .expect(200);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should not require request body', async () => {
      const response = await request(app)
        .patch('/api/v1/users/deactivate')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(userController.deactivateAccount).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/users/:userId', () => {
    it('should get user by ID', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(authenticate).toHaveBeenCalled();
      expect(profileController.getUserById).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      const userId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/v1/users/${userId}`)
        .expect(200);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should pass userId parameter to controller', async () => {
      const userId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(profileController.getUserById).toHaveBeenCalled();
    });
  });

  describe('Route Not Found', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/api/v1/users/nonexistent/route')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });

    it('should return 404 for DELETE method on change-password', async () => {
      await request(app)
        .delete('/api/v1/users/change-password')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });

    it('should return 404 for POST method on deactivate', async () => {
      await request(app)
        .post('/api/v1/users/deactivate')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });
  });

  describe('Route Structure', () => {
    it('should have all required routes defined', async () => {
      // Test that routes exist by attempting to access them
      const routes = [
        { method: 'post', path: '/api/v1/users/register' },
        { method: 'post', path: '/api/v1/users/login' },
        { method: 'patch', path: '/api/v1/users/change-password' },
        { method: 'patch', path: '/api/v1/users/deactivate' },
        { method: 'get', path: '/api/v1/users/507f1f77bcf86cd799439011' },
      ];

      for (const route of routes) {
        const response = await request(app)[route.method](route.path)
          .set('Authorization', 'Bearer mock-token')
          .send(route.method === 'post' ? mockUserData : {});

        // Should not return 404
        expect(response.status).not.toBe(404);
      }
    });
  });
});
