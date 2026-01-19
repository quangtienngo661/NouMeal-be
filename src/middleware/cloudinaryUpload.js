const { uploadToCloudinary } = require('./multer');
const AppError = require('../libs/util/AppError');

/**
 * Middleware để upload file lên Cloudinary
 * Sử dụng sau multer middleware
 */
module.exports = async function (req, res, next) {
    try {
        // Kiểm tra xem có file không
        if (!req.file) {

            console.log("debug");
            return;
            return next();
        }

        // Upload lên Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'mealgenie/foods', // Subfolder cụ thể
        });

        // Gán kết quả vào req để controller sử dụng
        req.cloudinaryResult = result;
        req.imageUrl = result.url;
        req.publicId = result.publicId;


        next();
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        return next(new AppError('Failed to upload image', 500));
    }
};
