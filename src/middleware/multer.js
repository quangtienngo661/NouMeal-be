const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const AppError = require('../libs/util/AppError');

// Sử dụng memory storage (best practice cho Cloudinary)
const storage = multer.memoryStorage();

// File filter với validation chi tiết
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Only .jpg, .jpeg, .png and .webp formats are allowed!', 400), false);
    }
};

// Khởi tạo Multer với cấu hình tối ưu
const upload = multer({ 
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1, // Giới hạn số file
    },
    fileFilter,
});

// Helper function để upload lên Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: options.folder || 'mealgenie',
            resource_type: 'auto',
            transformation: [
                { width: 1000, height: 1000, crop: 'limit', quality: 'auto' }
            ],
            ...options,
        };

        cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    reject(new AppError(`Cloudinary upload failed: ${error.message}`, 500));
                } else {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        width: result.width,
                        height: result.height,
                        format: result.format,
                    });
                }
            }
        ).end(buffer);
    });
};

// Helper function để xóa ảnh khỏi Cloudinary
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw new AppError('Failed to delete image from cloud', 500);
    }
};

module.exports = {
    upload,
    uploadToCloudinary,
    deleteFromCloudinary,
};
