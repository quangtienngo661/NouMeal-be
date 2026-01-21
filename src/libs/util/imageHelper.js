const AppError = require('./AppError');

/**
 * Convert base64 string to buffer for Cloudinary upload
 * @param {string} base64String - Base64 encoded image string (with or without data URI prefix)
 * @returns {Buffer} - Buffer object ready for Cloudinary upload
 */
const base64ToBuffer = (base64String) => {
    if (!base64String) {
        throw new AppError('Base64 string is required', 400);
    }

    try {
        // Remove data URI prefix if exists (e.g., "data:image/png;base64,")
        const base64Data = base64String.includes('base64,') 
            ? base64String.split('base64,')[1] 
            : base64String;

        // Convert to buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Validate buffer size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (buffer.length > maxSize) {
            throw new AppError('Image size exceeds 5MB limit', 400);
        }

        return buffer;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError('Invalid base64 image format', 400);
    }
};

/**
 * Extract image format from base64 data URI
 * @param {string} base64String - Base64 string with data URI prefix
 * @returns {string} - Image format (jpeg, png, webp, etc.)
 */
const getImageFormatFromBase64 = (base64String) => {
    if (!base64String || !base64String.includes('data:image/')) {
        return 'jpeg'; // Default format
    }

    const match = base64String.match(/data:image\/([a-zA-Z]+);base64,/);
    return match ? match[1] : 'jpeg';
};

const isFromCloudinary = (url) => {
    return url.includes('res.cloudinary.com');
}

module.exports = {
    isFromCloudinary,
    base64ToBuffer,
    getImageFormatFromBase64
};
