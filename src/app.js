// ========= IMPORT SECTION =========

// Built-in dependencies/middlewares
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Utils
const { success } = require('./libs/util/response');

// Middlewares
const { globalErrorHandler } = require('./middleware/globalErrorHandler');
const { routeNotFound } = require('./middleware/routeNotFound');

// Configs
const { connectDb } = require('./config/dbConfig');
const { corsConfig } = require('./config/corsConfig');
const { globalLimiter } = require('./config/rateLimitConfig');

// Swagger setup
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./swagger');

// Import models to register them
require('./model/foodModel');

// Imported routes
const userRoute = require('./route/userRoute');
const profileRoute = require('./route/profileRoute');
const authRoute = require('./route/authRoute');
const foodRoute = require('./route/foodRoute');
const reportRoute = require('./route/reportRoute');
const adminRoute = require('./route/adminRoute');
const postRoute = require('./route/postRoute');
const commentRoute = require('./route/commentRoute');
const notificationRoute = require('./route/notificationRoute');
// ========= MIDDLEWARE SECTION =========
const app = express();
connectDb();

// Swagger configuration is now imported from swagger.js

// Using middlewares
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(cors(corsConfig));
app.use(globalLimiter);
app.use(helmet());

// Response helper
app.use((req, res, next) => {
  res.ok = (data, status, message, meta) =>
    success(res, data, message, status, meta);
  next();
});

// Swagger UI setup
const { getSwaggerSpec } = require('./swagger');

app.use('/api-docs', swaggerUi.serve, (req, res, next) => {
  return swaggerUi.setup(getSwaggerSpec(), swaggerUiOptions)(req, res, next);
});

// Routes
app.use('/api/v1/users', userRoute); // Authentication routes
app.use('/api/v1/profile', profileRoute); // Profile management routes
app.use('/api/v1/auth', authRoute); // Enhanced authentication routes
app.use('/api/v1/foods', foodRoute); // Food information
app.use('/api/v1/reports', reportRoute); // Reports and statistics
app.use('/api/v1/admin', adminRoute); // Admin utilities
app.use('/api/v1/posts', postRoute); // Posts and social features
app.use('/api/v1/comments', commentRoute); // Comments on posts
app.use('/api/v1/notifications', notificationRoute); // Notifications
// Home route
app.get('/', (req, res) => {
  return res.end('Welcome to MealGenie API');
});

// Middleware for catching unexisted routes
// For more specifically, if there is an unmatched route ascendingly, this middleware will run
app.use(routeNotFound);

// Error handler
app.use(globalErrorHandler);

// Export to server.js
module.exports = app;
