const AppError = require("../libs/util/AppError");

module.exports = function parseRequestPayload(req, res, next) {
    // console.log(req.body);
    // return;
    try {
        // Check if req.body exists and has data property
        if (req.body && req.body.data) {
            // Only parse if data is a string (from multipart/form-data)
            if (typeof req.body.data === 'string') {
                req.body.data = JSON.parse(req.body.data);
                // console.log("Parsed JSON data:", req.body.data);
            }
            // If it's already an object, no need to parse
        }
        next();
    } catch (err) {
        console.log("Error parsing JSON in data field:", err.message);
        return next(new AppError("Invalid JSON format in 'data' field", 400));
    }
}