const { handleValidationErrors } = require('../../../middleware/validator');
const { validationResult } = require('express-validator');
const AppError = require('../../../libs/util/AppError');

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

describe('Validator Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('handleValidationErrors', () => {
    it('should call next() if no validation errors', () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      });

      handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should call next with AppError if validation errors exist', () => {
      const mockErrors = [
        { msg: 'Email is required' },
        { msg: 'Password must be at least 6 characters' },
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Validation Error: Email is required, Password must be at least 6 characters',
          statusCode: 400,
        })
      );
    });

    it('should handle single validation error', () => {
      const mockErrors = [{ msg: 'Invalid email format' }];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation Error: Invalid email format',
          statusCode: 400,
        })
      );
    });

    it('should combine multiple error messages', () => {
      const mockErrors = [
        { msg: 'Name is required' },
        { msg: 'Age must be at least 13' },
        { msg: 'Height is required' },
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Validation Error: Name is required, Age must be at least 13, Height is required',
          statusCode: 400,
        })
      );
    });

    it('should create AppError instance', () => {
      const mockErrors = [{ msg: 'Test error' }];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req, res, next);

      const calledWith = next.mock.calls[0][0];
      expect(calledWith).toBeInstanceOf(AppError);
      expect(calledWith.statusCode).toBe(400);
      expect(calledWith.isOperational).toBe(true);
    });
  });
});
