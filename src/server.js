require('dotenv').config();
const app = require('./app');
const { mergePythonSpecs } = require('./swagger');

const PORT = process.env.PORT || process.env.BE_PORT || 3000;

// === 🔥 QUAN TRỌNG: GHÉP OPENAPI TRƯỚC KHI KHỞI ĐỘNG SERVER ===
mergePythonSpecs()
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📚 API Documentation available at: http://localhost:${PORT}/api-docs`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Server accessible at: http://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM received, shutting down gracefully');
      server.close(() => console.log('✅ Process terminated'));
    });
  })
  .catch((err) => {
    console.error("❌ Failed to merge Python OpenAPI specs:", err);
    process.exit(1);
  });

// Unhandled errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.log('🔄 Shutting down the server');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.log('🔄 Shutting down the application');
  process.exit(1);
});
