const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const axios = require('axios');

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MealGenie API',
      version: '1.0.0',
      description: `
        A comprehensive meal planning and nutrition tracking API built with Node.js, Express, Python AI services, and MongoDB.
        
        This documentation includes:
        - Node.js backend services (Authentication, Users, Foods)
        - Python AI recommendation service (port 5001)
        - Python chatbot service (port 5002)
      `,
      contact: {
        name: 'MealGenie API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Node.js Backend Server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Alternative Development Server',
      },
      {
        url: 'http://localhost:5001',
        description: 'Python AI Recommendation Service',
      },
      {
        url: 'http://localhost:5002',
        description: 'Python Chatbot Service',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        Food: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64f1f77bcf86cd7994390123' },
            name: { type: 'string', example: 'Grilled Chicken Salad' },
            description: { type: 'string', example: 'Lean grilled chicken with mixed greens and vinaigrette.' },
            instructions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'integer', minimum: 1, example: 1 },
                  description: { type: 'string', example: 'Season chicken with salt and pepper.' }
                },
                required: ['step','description']
              },
              example: [
                { step: 1, description: 'Season chicken with salt and pepper.' },
                { step: 2, description: 'Grill for 6–8 minutes per side until cooked.' },
                { step: 3, description: 'Toss with greens and vinaigrette.' }
              ]
            },
            imageUrl: { type: 'string', format: 'uri', example: 'https://cdn.example.com/images/grilled-chicken-salad.jpg' },
            category: {
              type: 'string',
              enum: [
                'fruits','vegetables','grains','protein','dairy','fats','beverages','snacks','desserts','spices'
              ],
              example: 'protein'
            },
            meal: { type: 'string', enum: ['breakfast','lunch','dinner','snack'], example: 'lunch' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Chicken Breast' },
                  amount: { type: 'string', example: '200g' }
                }
              }
            },
            nutritionalInfo: {
              type: 'object',
              properties: {
                calories: { type: 'number', example: 350 },
                protein: { type: 'number', example: 35 },
                carbohydrates: { type: 'number', example: 12 },
                fat: { type: 'number', example: 15 },
                fiber: { type: 'number', example: 5 },
                sugar: { type: 'number', example: 4 },
                sodium: { type: 'number', example: 420 },
                cholesterol: { type: 'number', example: 75 }
              }
            },
            allergens: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'peanuts','tree_nuts','milk','eggs','wheat_gluten','fish','shellfish','soy','corn','sesame','pineapple','strawberry','banana','tomato','apple','chocolate','honey','mustard','other'
                ]
              },
              example: ['milk']
            },
            isActive: { type: 'boolean', example: true },
            tags: { type: 'array', items: { type: 'string' }, example: ['high_protein','low_carb'] },
            postedBy: { type: 'string', example: '507f1f77bcf86cd799439011', description: 'User ID who created this food (optional)' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-10-07T10:30:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-10-07T10:30:00.000Z' }
          }
        },
        FoodCreateRequest: {
          type: 'object',
          required: ['name','category'],
          properties: {
            name: { type: 'string', example: 'Oatmeal with Berries' },
            description: { type: 'string', example: 'Healthy oatmeal topped with fresh berries.' },
            instructions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'integer', minimum: 1 },
                  description: { type: 'string' }
                },
                required: ['step','description']
              },
              example: [
                { step: 1, description: 'Boil oats with milk for 5 minutes.' },
                { step: 2, description: 'Top with fresh berries and honey.' }
              ]
            },
            imageUrl: { type: 'string', format: 'uri', example: 'https://cdn.example.com/images/oatmeal-berries.jpg' },
            category: { type: 'string', enum: [
              'fruits','vegetables','grains','protein','dairy','fats','beverages','snacks','desserts','spices'
            ], example: 'grains' },
            meal: { type: 'string', enum: ['breakfast','lunch','dinner','snack'], example: 'breakfast' },
            ingredients: {
              type: 'array',
              items: { type: 'object', properties: { name: { type: 'string', example: 'Oats' }, amount: { type: 'string', example: '1 cup' } } }
            },
            nutritionalInfo: { $ref: '#/components/schemas/Food/properties/nutritionalInfo' },
            allergens: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } }
          }
        },
        FoodUpdateRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            instructions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'integer', minimum: 1 },
                  description: { type: 'string' }
                }
              }
            },
            imageUrl: { type: 'string', format: 'uri' },
            category: { type: 'string', enum: [
              'fruits','vegetables','grains','protein','dairy','fats','beverages','snacks','desserts','spices'
            ] },
            meal: { type: 'string', enum: ['breakfast','lunch','dinner','snack'] },
            ingredients: {
              type: 'array',
              items: { type: 'object', properties: { name: { type: 'string' }, amount: { type: 'string' } } }
            },
            nutritionalInfo: {
              type: 'object',
              properties: {
                calories: { type: 'number' },
                protein: { type: 'number' },
                carbohydrates: { type: 'number' },
                fat: { type: 'number' },
                fiber: { type: 'number' },
                sugar: { type: 'number' },
                sodium: { type: 'number' },
                cholesterol: { type: 'number' }
              }
            },
            allergens: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
            tags: { type: 'array', items: { type: 'string' } }
          }
        },
        FoodRecommendationResponse: {
          type: 'object',
          properties: {
            breakfast: { type: 'array', items: { $ref: '#/components/schemas/Food' } },
            lunch: { type: 'array', items: { $ref: '#/components/schemas/Food' } },
            dinner: { type: 'array', items: { $ref: '#/components/schemas/Food' } },
            snack: { type: 'array', items: { $ref: '#/components/schemas/Food' } }
          }
        },
        FoodListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Foods retrieved successfully' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Food' }
            }
          }
        },
        FoodItemResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Food retrieved successfully' },
            data: { $ref: '#/components/schemas/Food' }
          }
        },
        FoodRecommendationWrapped: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Recommendations generated successfully' },
            data: { $ref: '#/components/schemas/FoodRecommendationResponse' }
          }
        },
        DailyCalorieNeedsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Daily calorie needs retrieved successfully' },
            data: {
              type: 'object',
              properties: {
                totalCalories: { type: 'number', example: 2200 },
                macroDistribution: {
                  type: 'object',
                  properties: {
                    protein: { type: 'number', example: 150 },
                    carbohydrates: { type: 'number', example: 250 },
                    fat: { type: 'number', example: 70 }
                  }
                }
              }
            }
          }
        },
        RegistrationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'User registered successfully! Please check your email for verification code.' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Unique user identifier',
              example: '507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe',
            },
            age: {
              type: 'integer',
              minimum: 13,
              maximum: 120,
              description: 'User age in years',
              example: 25,
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              description: 'User gender',
              example: 'male',
            },
            height: {
              type: 'number',
              minimum: 50,
              maximum: 300,
              description: 'User height in centimeters',
              example: 175,
            },
            weight: {
              type: 'number',
              minimum: 20,
              maximum: 500,
              description: 'User weight in kilograms',
              example: 70,
            },
            goal: {
              type: 'string',
              enum: [
                'lose_weight',
                'maintain_weight',
                'gain_weight',
                'build_muscle',
                'improve_health',
              ],
              description: 'User fitness goal',
              example: 'build_muscle',
            },
            preferences: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'User food preferences',
              example: ['vegetarian', 'high_protein'],
            },
            allergies: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'User food allergies',
              example: ['nuts', 'dairy'],
            },
            favoriteFoods: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'References to favorite food items',
              example: [],
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active',
              example: true,
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp',
              example: '2024-10-07T10:30:00.000Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2024-10-07T10:30:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2024-10-07T10:30:00.000Z',
            },
          },
        },
        UserRegistrationRequest: {
          type: 'object',
          required: [
            'email',
            'password',
            'name',
            'age',
            'gender',
            'height',
            'weight',
            'goal',
          ],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Valid email address',
              example: 'john.doe@example.com',
            },
            password: {
              type: 'string',
              minLength: 6,
              description:
                'Password (min 6 chars, must contain uppercase, lowercase, and number)',
              example: 'SecurePass123',
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Full name',
              example: 'John Doe',
            },
            age: {
              type: 'integer',
              minimum: 13,
              maximum: 120,
              description: 'Age in years',
              example: 25,
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              description: 'Gender',
              example: 'male',
            },
            height: {
              type: 'number',
              minimum: 50,
              maximum: 300,
              description: 'Height in centimeters',
              example: 175,
            },
            weight: {
              type: 'number',
              minimum: 20,
              maximum: 500,
              description: 'Weight in kilograms',
              example: 70,
            },
            goal: {
              type: 'string',
              enum: [
                'lose_weight',
                'maintain_weight',
                'gain_weight',
                'build_muscle',
                'improve_health',
              ],
              description: 'Fitness goal',
              example: 'build_muscle',
            },
            preferences: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Food preferences (optional)',
              example: ['vegetarian', 'high_protein'],
            },
            allergies: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Food allergies (optional)',
              example: ['nuts', 'dairy'],
            },
          },
        },
        UserLoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            password: {
              type: 'string',
              description: 'User password',
              example: 'SecurePass123',
            },
          },
        },
        UserProfileUpdateRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Full name',
              example: 'John Updated',
            },
            age: {
              type: 'integer',
              minimum: 13,
              maximum: 120,
              description: 'Age in years',
              example: 26,
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              description: 'Gender',
              example: 'male',
            },
            height: {
              type: 'number',
              minimum: 50,
              maximum: 300,
              description: 'Height in centimeters',
              example: 175,
            },
            weight: {
              type: 'number',
              minimum: 20,
              maximum: 500,
              description: 'Weight in kilograms',
              example: 72,
            },
            goal: {
              type: 'string',
              enum: [
                'lose_weight',
                'maintain_weight',
                'gain_weight',
                'build_muscle',
                'improve_health',
              ],
              description: 'Fitness goal',
              example: 'build_muscle',
            },
            preferences: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Food preferences',
              example: ['vegetarian', 'high_protein', 'organic'],
            },
            allergies: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Food allergies',
              example: ['nuts', 'dairy'],
            },
          },
        },
        PasswordChangeRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              description: 'Current password',
              example: 'OldPass123',
            },
            newPassword: {
              type: 'string',
              minLength: 6,
              description:
                'New password (min 6 chars, must contain uppercase, lowercase, and number)',
              example: 'NewSecurePass456',
            },
          },
        },
        EmailVerificationRequest: {
          type: 'object',
          required: ['email', 'otp'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com'
            },
            otp: {
              type: 'string',
              description: '6-digit OTP received via email',
              example: '123456'
            }
          }
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com'
            }
          }
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['email', 'otp', 'newPassword'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com'
            },
            otp: {
              type: 'string',
              description: '6-digit OTP received via email',
              example: '123456'
            },
            newPassword: {
              type: 'string',
              minLength: 6,
              description: 'New password (min 6 chars, must contain uppercase, lowercase, and number)',
              example: 'NewSecurePass123'
            }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Valid refresh token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        EnhancedAuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status',
              example: true
            },
            message: {
              type: 'string',
              description: 'Response message',
              example: 'Login successful'
            },
            data: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                  description: 'JWT access token (short-lived)',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                refreshToken: {
                  type: 'string',
                  description: 'JWT refresh token (long-lived)',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                user: {
                  $ref: '#/components/schemas/User'
                }
              }
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Response message',
              example: 'Login successful',
            },
            token: {
              type: 'string',
              description: 'JWT authentication token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Response message',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Validation error occurred',
            },
            error: {
              type: 'object',
              description: 'Error details',
              properties: {
                details: {
                  type: 'string',
                  example: 'Email is required',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description:
          'User registration, login, password change, and account deactivation',
      },
      {
        name: 'User Profile',
        description:
          'User profile viewing, updating, and user lookup operations',
      },
      {
        name: 'Foods',
        description: 'Food catalog management and recommendation endpoints'
      },
    ],
  },
  apis: [
    './src/route/*.js',
    './src/controller/*.js',
    './src/model/*.js',
  ],
};

// Generate initial Swagger specification
let swaggerSpec = swaggerJSDoc(swaggerOptions);

// Deep merge helper function
function deepMerge(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Merge Python Swagger specs asynchronously
async function mergePythonSpecs() {
  try {
    console.log('🔄 Attempting to merge Python Swagger specifications...');
    
    const fetchPromises = [
      axios.get('http://localhost:5001/api-docs/apispec.json', { timeout: 3000 })
        .catch(err => {
          console.warn('⚠️  AI Service (5001) not available:', err.message);
          return null;
        }),
      axios.get('http://localhost:5002/api-docs/apispec.json', { timeout: 3000 })
        .catch(err => {
          console.warn('⚠️  Chatbot Service (5002) not available:', err.message);
          return null;
        })
    ];

    const [aiSpecResponse, botSpecResponse] = await Promise.all(fetchPromises);

    // Merge AI Service specs
    if (aiSpecResponse && aiSpecResponse.data) {
      const aiSpec = aiSpecResponse.data;
      
      // Merge paths
      swaggerSpec.paths = {
        ...(swaggerSpec.paths || {}),
        ...(aiSpec.paths || {})
      };

      // Merge components (schemas, securitySchemes, etc.)
      if (aiSpec.components) {
        swaggerSpec.components = deepMerge(
          swaggerSpec.components || {},
          aiSpec.components
        );
      }

      // Merge tags (avoid duplicates)
      if (aiSpec.tags && Array.isArray(aiSpec.tags)) {
        const existingTagNames = (swaggerSpec.tags || []).map(t => t.name);
        const newTags = aiSpec.tags.filter(t => !existingTagNames.includes(t.name));
        swaggerSpec.tags = [...(swaggerSpec.tags || []), ...newTags];
      }

      console.log('✅ AI Service Swagger merged successfully');
    }

    // Merge Chatbot Service specs
    if (botSpecResponse && botSpecResponse.data) {
      const botSpec = botSpecResponse.data;
      
      // Merge paths
      swaggerSpec.paths = {
        ...(swaggerSpec.paths || {}),
        ...(botSpec.paths || {})
      };

      // Merge components
      if (botSpec.components) {
        swaggerSpec.components = deepMerge(
          swaggerSpec.components || {},
          botSpec.components
        );
      }

      // Merge tags (avoid duplicates)
      if (botSpec.tags && Array.isArray(botSpec.tags)) {
        const existingTagNames = (swaggerSpec.tags || []).map(t => t.name);
        const newTags = botSpec.tags.filter(t => !existingTagNames.includes(t.name));
        swaggerSpec.tags = [...(swaggerSpec.tags || []), ...newTags];
      }

      console.log('✅ Chatbot Service Swagger merged successfully');
    }

    if (!aiSpecResponse && !botSpecResponse) {
      console.log('ℹ️  No Python services available. Using Node.js specs only.');
    }

  } catch (err) {
    console.error('❌ Failed to merge Python Swagger:', err.message);
    console.log('ℹ️  Continuing with Node.js API documentation only.');
  }
}

// Swagger UI options
const swaggerUiOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #2E7D32; }
    .swagger-ui .scheme-container { 
      background: #f5f5f5; 
      padding: 15px; 
      border-radius: 5px; 
      margin: 15px 0; 
    }
    .swagger-ui .info .description p {
      margin: 10px 0;
      line-height: 1.6;
    }
  `,
  customSiteTitle: 'MealGenie API Documentation',
  customfavIcon: '/favicon.ico',
  explorer: true,
};

// Initialize merge on module load
mergePythonSpecs().catch(err => {
  console.error('Error during initial spec merge:', err.message);
});

// Export function to get current spec (useful for dynamic updates)
const getSwaggerSpec = () => swaggerSpec;

// Export function to manually trigger re-merge
const refreshPythonSpecs = mergePythonSpecs;

module.exports = {
  swaggerSpec,
  getSwaggerSpec,
  refreshPythonSpecs: mergePythonSpecs, 
  mergePythonSpecs,                     
  swaggerUi,
  swaggerUiOptions,
};