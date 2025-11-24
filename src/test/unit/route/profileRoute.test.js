const request = require('supertest');
const express = require('express');
const profileRoute = require('../../../route/profileRoute');
const profileController = require('../../../controller/profileController');
const { authenticate } = require('../../../middleware/authMiddleware');
const { handleValidationErrors } = require('../../../middleware/validator');
const { mockUpdateData } = require('../../helpers/mockData');

// Mock dependencies
jest.mock('../../../controller/profileController');
jest.mock('../../../middleware/authMiddleware');
jest.mock('../../../middleware/validator');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/profile', profileRoute);

describe('Profile Routes Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock middleware to pass through
    authenticate.mockImplementation((req, res, next) => {
      req.user = { _id: 'mock-user-id' };
      next();
    });
    handleValidationErrors.mockImplementation((req, res, next) => next());

    // Default mock implementations
    profileController.updateProfile.mockImplementation((req, res) => {
      res.status(200).json({ success: true, message: 'Profile updated' });
    });
    profileController.getUserById.mockImplementation((req, res) => {
      res.status(200).json({ success: true, data: { user: {} } });
    });
  });

  describe('GET /api/v1/profile', () => {
    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(authenticate).toHaveBeenCalled();
      expect(profileController.getUserById).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/profile').expect(200);

      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/profile', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .patch('/api/v1/profile')
        .set('Authorization', 'Bearer mock-token')
        .send(mockUpdateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(authenticate).toHaveBeenCalled();
      expect(profileController.updateProfile).toHaveBeenCalled();
    });

    it('should call validation middleware', async () => {
      await request(app)
        .patch('/api/v1/profile')
        .set('Authorization', 'Bearer mock-token')
        .send(mockUpdateData)
        .expect(200);

      expect(handleValidationErrors).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/v1/profile')
        .send(mockUpdateData)
        .expect(200);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { name: 'New Name' };

      const response = await request(app)
        .patch('/api/v1/profile')
        .set('Authorization', 'Bearer mock-token')
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(profileController.updateProfile).toHaveBeenCalled();
    });
  });

  describe('Route Not Found', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/api/v1/profile/nonexistent')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });

    it('should return 404 for invalid methods', async () => {
      await request(app)
        .delete('/api/v1/profile')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });
  });
});
