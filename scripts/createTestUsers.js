const mongoose = require('mongoose');
const User = require('../src/model/userModel');
require('dotenv').config();

const testUsers = [
    {
        name: 'Alice Johnson',
        email: 'alice@test.com',
        password: 'password123',
        age: 25,
        gender: 'female',
        height: 165,
        weight: 60,
        activity: 'moderately_active',
        goal: 'lose_weight',
        preferences: ['vegetarian', 'low_carb'],
        allergies: ['peanuts'],
        isEmailVerified: true,
        isActive: true,
    },
    {
        name: 'Bob Smith',
        email: 'bob@test.com',
        password: 'password123',
        age: 30,
        gender: 'male',
        height: 180,
        weight: 85,
        activity: 'very_active',
        goal: 'build_muscle',
        preferences: ['high_protein', 'low_fat'],
        allergies: [],
        isEmailVerified: true,
        isActive: true,
    },
    {
        name: 'Charlie Brown',
        email: 'charlie@test.com',
        password: 'password123',
        age: 28,
        gender: 'male',
        height: 175,
        weight: 75,
        activity: 'lightly_active',
        goal: 'maintain_weight',
        preferences: ['paleo'],
        allergies: ['milk'],
        isEmailVerified: true,
        isActive: true,
    },
    {
        name: 'Diana Prince',
        email: 'diana@test.com',
        password: 'password123',
        age: 26,
        gender: 'female',
        height: 170,
        weight: 65,
        activity: 'moderately_active',
        goal: 'gain_weight',
        preferences: ['vegan', 'organic'],
        allergies: ['soy', 'tree_nuts'],
        isEmailVerified: true,
        isActive: true,
    },
];

async function createTestUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Delete existing test users
        await User.deleteMany({ email: { $in: testUsers.map((u) => u.email) } });
        console.log('🗑️  Deleted existing test users');

        // Create new test users
        const createdUsers = await User.create(testUsers);
        console.log('✅ Created test users:');

        createdUsers.forEach((user) => {
            console.log(`
                📧 Email: ${user.email}
                🔑 Password: password123
                🆔 ID: ${user._id}
                👤 Name: ${user.name}
            `);
        });

        console.log('\n🎯 Testing Instructions:');
        console.log('1. Login as alice@test.com');
        console.log('2. Follow Bob, Charlie, Diana');
        console.log('3. Check notifications of Bob, Charlie, Diana');
        console.log('4. Login as bob@test.com');
        console.log('5. Create a post, comment, like');
        console.log('6. Check Alice\'s notifications');

        await mongoose.disconnect();
        console.log('\n✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createTestUsers();
