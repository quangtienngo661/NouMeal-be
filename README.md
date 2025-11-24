# NouMeal Backend API

This is the backend service for the **NouMeal** AI Meal Recommendation project.  
It is built with **Express.js** and **MongoDB**, providing RESTful APIs for meal recommendations, user management, and recipe data with AI technology.

---

## 🌟 Features

- **AI-Powered Meal Recommendations**: Intelligent meal suggestions based on user preferences
- **User Authentication & Authorization**: JWT-based secure authentication system
- **Recipe Management**: CRUD operations for recipes and meal data
- **Rate Limiting**: API rate limiting for security and performance
- **Input Validation**: Comprehensive request validation using Joi and express-validator
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Error Handling**: Global error handling with detailed error responses
- **Security**: Helmet.js for security headers, CORS configuration
- **Database**: MongoDB with Mongoose ODM

---

## 📦 Prerequisites

- [Node.js](https://nodejs.org/) (>= 18.x recommended)
- [MongoDB](https://www.mongodb.com/) (local installation or MongoDB Atlas)
- npm or yarn package manager

---

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/quangtienngo661/NouMeal-be.git
   ```

<!-- 2. **Install dependencies**

   ```bash
   npm install
   ``` -->

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration:

   ```env
   MONGO_URL=mongodb:your-db-url
   BE_PORT= your_port || 3000
   JWT_SECRET=your-super-secret-jwt-key
   ```

3. **Start the development server**
   ```bash
   npm run docker:build:dev
   npm run docker:up:dev
   ```

The server will start on `http://localhost:3000` (or your configured port).

---

<!-- ## 🔧 Available Scripts

| Script           | Description                           |
| ---------------- | ------------------------------------- | ------------------------ |
| `npm run dev`    | Start development server with nodemon |
| <!--             | `npm test`                            | Run test suite with Jest |
| `npm run lint`   | Run ESLint for code linting           |
| `npm run format` | Format code with Prettier             | -->                      | -->

---

## 📚 API Documentation

Once the server is running, you can access the interactive API documentation at:
```
http://localhost:3000/api-docs
```

The API documentation is generated using Swagger/OpenAPI and provides detailed information about all available endpoints, request/response schemas, and authentication requirements.

## 🔐 Authentication

This API uses **JWT (JSON Web Tokens)** for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

<!-- ### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token -->

---

## 🛡️ Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: Request rate limiting to prevent abuse
- **Input Validation**: Request validation using Joi and express-validator
- **Password Hashing**: Secure password hashing with bcrypt
- **JWT Authentication**: Secure token-based authentication

---

## 🗄️ Database

This project uses **MongoDB** with **Mongoose** ODM. The database configuration is located in `src/config/dbConfig.js`.

<!-- ### Database Schema
- **Users**: User profiles and authentication data
- **Recipes**: Recipe information and metadata
- **Recommendations**: AI-generated meal recommendations
- **Preferences**: User dietary preferences and restrictions

--- -->

<!-- ## 🧪 Testing

Run the test suite using:
```bash
npm test
``` -->

<!-- The project uses **Jest** and **Supertest** for unit and integration testing. -->

---

<!-- ## 🔧 Development

### Code Quality
- **ESLint**: Code linting with recommended rules
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks for code quality
- **Lint-staged**: Run linters on staged files -->

### Environment Setup

<!-- 1. Install dependencies: `npm install` -->
1. Set up your `.env` file
2. Start MongoDB service
3. Run development server: 
```bash
npm run docker:build:dev
npm run docker:up:dev
```

---

## 📝 Environment Variables

| Variable     | Description               | Example                 |
| ------------ | ------------------------- | ----------------------- |
| `MONGO_URL`  | MongoDB connection string | `mongo_url`             |
| `BE_PORT`    | Server port number        | `your_port`             |
| `JWT_SECRET` | JWT signing secret        | `your-super-secret-key` |

---

<!-- ## 🚀 Deployment -->

<!-- ### Production Build
1. Set production environment variables
2. Install production dependencies: `npm install --production`
3. Start the server: `node src/server.js`

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

--- -->

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

---

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Quang Tien Ngo** - [@quangtienngo661](https://github.com/quangtienngo661)

---

## 🙏 Acknowledgments

- Express.js team for the excellent web framework
- MongoDB team for the robust database solution
- All contributors who helped make this project better

---

## 📞 Support

If you have any questions or need help with setup, please:

1. Check the [API Documentation](http://localhost:5000/api-docs)
2. Search existing [Issues](https://github.com/quangtienngo661/NouMeal-be/issues)
3. Create a new issue if needed

---

**Happy Coding! 🍽️✨**
