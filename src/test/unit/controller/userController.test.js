const { registerUser, loginUser, changePassword, deactivateAccount } = require('../../../controller/userController');
const userService = require('../../../service/userService');
const { createSendToken } = require('../../../middleware/authMiddleware');

jest.mock('../../../service/userService');
jest.mock('../../../middleware/authMiddleware');

describe('UserController', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            user: {},
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

    describe('registerUser', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'Password123',
                name: 'Test User',
                age: 25,
                gender: 'male',
                height: 175,
                weight: 70,
                goal: 'build_muscle',
            };

            const mockUser = {
                _id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                name: 'Test User',
            };

            req.body = userData;
            userService.registerUser.mockResolvedValue(mockUser);

            await registerUser(req, res, next);

            expect(userService.registerUser).toHaveBeenCalledWith(userData);
            expect(createSendToken).toHaveBeenCalledWith(mockUser, 201, res, 'User registered successfully');
        });

        // it('should handle registration errors', async () => {
        //     req.body = {
        //         email: 'test@example.com',
        //         password: 'Password123',
        //     };

        //     const error = new Error('Email already exists');
        //     userService.registerUser.mockRejectedValue(error);

        //     await registerUser(req, res, next);

        //     expect(userService.registerUser).toHaveBeenCalled();
        //     expect(next).toHaveBeenCalledWith(error);
        //     expect(createSendToken).not.toHaveBeenCalled();
        // });
    });

    describe('loginUser', () => {
        it('should login user successfully', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'Password123',
            };

            const mockUser = {
                _id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                name: 'Test User',
            };

            req.body = loginData;
            userService.loginUser.mockResolvedValue(mockUser);

            await loginUser(req, res, next);

            expect(userService.loginUser).toHaveBeenCalledWith(loginData.email, loginData.password);
            expect(createSendToken).toHaveBeenCalledWith(mockUser, 200, res, 'Login successful');
        });

        // it('should handle login errors', async () => {
        //     req.body = {
        //         email: 'test@example.com',
        //         password: 'WrongPassword',
        //     };

        //     const error = new Error('Invalid email or password');
        //     userService.loginUser.mockRejectedValue(error);

        //     await loginUser(req, res, next);

        //     expect(userService.loginUser).toHaveBeenCalled();
        //     expect(next).toHaveBeenCalledWith(error);
        // });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            req.user = { _id: '507f1f77bcf86cd799439011' };
            req.body = {
                currentPassword: 'OldPassword123',
                newPassword: 'NewPassword456',
            };

            const mockResult = {
                message: 'Password changed successfully',
            };

            userService.changePassword.mockResolvedValue(mockResult);

            await changePassword(req, res, next);

            expect(userService.changePassword).toHaveBeenCalledWith(
                req.user._id,
                req.body.currentPassword,
                req.body.newPassword
            );
            expect(res.ok).toHaveBeenCalledWith(mockResult.message, 200);
        });

        // it('should handle incorrect current password', async () => {
        //     req.user = { _id: '507f1f77bcf86cd799439011' };
        //     req.body = {
        //         currentPassword: 'WrongPassword',
        //         newPassword: 'NewPassword456',
        //     };

        //     const error = new Error('Current password is incorrect');
        //     userService.changePassword.mockRejectedValue(error);

        //     await changePassword(req, res, next);

        //     expect(userService.changePassword).toHaveBeenCalled();
        //     expect(next).toHaveBeenCalledWith(error);
        // });
    });

    describe('deactivateAccount', () => {
        it('should deactivate account successfully', async () => {
            req.user = { _id: '507f1f77bcf86cd799439011' };

            const mockResult = {
                message: 'Account deactivated successfully',
            };

            userService.deactivateUser.mockResolvedValue(mockResult);

            await deactivateAccount(req, res, next);

            expect(userService.deactivateUser).toHaveBeenCalledWith(req.user._id);
            expect(res.ok).toHaveBeenCalledWith(mockResult.message, 200);
        });

        // it('should handle deactivation errors', async () => {
        //     req.user = { _id: '507f1f77bcf86cd799439011' };

        //     const error = new Error('User not found');
        //     userService.deactivateUser.mockRejectedValue(error);

        //     await deactivateAccount(req, res, next);

        //     expect(userService.deactivateUser).toHaveBeenCalled();
        //     expect(next).toHaveBeenCalledWith(error);
        // });
    });
});