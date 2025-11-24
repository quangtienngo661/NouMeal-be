const mongoose = require('mongoose');
const Food = require('../../../model/foodModel');

describe('Food Model', () => {
  describe('Schema validation', () => {
    it('should create a valid food item', async () => {
      const validFood = {
        name: 'Grilled Chicken Breast',
        description: 'Lean protein source',
        category: 'protein',
        nutritionalInfo: {
          calories: 165,
          protein: 31,
          carbohydrates: 0,
          fat: 3.6,
          fiber: 0,
          sugar: 0,
        },
        allergens: ['none'],
        tags: ['healthy', 'high-protein', 'low-carb'],
      };

      const food = new Food(validFood);
      const savedFood = await food.save();

      expect(savedFood._id).toBeDefined();
      expect(savedFood.name).toBe(validFood.name);
      expect(savedFood.description).toBe(validFood.description);
      expect(savedFood.category).toBe(validFood.category);
      expect(savedFood.nutritionalInfo.calories).toBe(validFood.nutritionalInfo.calories);
      expect(savedFood.nutritionalInfo.protein).toBe(validFood.nutritionalInfo.protein);
      expect(savedFood.isActive).toBe(true); // default value
      expect(savedFood.createdAt).toBeDefined();
      expect(savedFood.updatedAt).toBeDefined();
    });

    it('should require name field', async () => {
      const foodWithoutName = new Food({
        category: 'protein',
        nutritionalInfo: { calories: 100 },
      });

      let error;
      try {
        await foodWithoutName.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.name.message).toBe('Food name is required');
    });

    it('should require category field', async () => {
      const foodWithoutCategory = new Food({
        name: 'Test Food',
        nutritionalInfo: { calories: 100 },
      });

      let error;
      try {
        await foodWithoutCategory.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
      expect(error.errors.category.message).toBe('Food category is required');
    });

    it('should validate category enum values', async () => {
      const invalidCategoryFood = new Food({
        name: 'Test Food',
        category: 'invalid_category',
        nutritionalInfo: { calories: 100 },
      });

      let error;
      try {
        await invalidCategoryFood.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
      expect(error.errors.category.message).toContain('Category must be one of');
    });

    it('should accept valid category values', async () => {
      const validCategories = [
        'fruits',
        'vegetables',
        'grains',
        'protein',
        'dairy',
        'fats',
        'beverages',
        'snacks',
        'desserts',
        'spices',
      ];

      for (const category of validCategories) {
        const food = new Food({
          name: `Test ${category}`,
          category: category,
        });

        const savedFood = await food.save();
        expect(savedFood.category).toBe(category);
      }
    });

    it('should trim name and description', async () => {
      const food = new Food({
        name: '  Grilled Chicken  ',
        description: '  Healthy protein source  ',
        category: 'protein',
      });

      const savedFood = await food.save();

      expect(savedFood.name).toBe('Grilled Chicken');
      expect(savedFood.description).toBe('Healthy protein source');
    });

    it('should enforce maximum length for name', async () => {
      const longName = 'a'.repeat(101);
      const food = new Food({
        name: longName,
        category: 'protein',
      });

      let error;
      try {
        await food.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.name.message).toBe('Food name cannot exceed 100 characters');
    });

    it('should enforce maximum length for description', async () => {
      const longDescription = 'a'.repeat(501);
      const food = new Food({
        name: 'Test Food',
        description: longDescription,
        category: 'protein',
      });

      let error;
      try {
        await food.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.description).toBeDefined();
      expect(error.errors.description.message).toBe('Description cannot exceed 500 characters');
    });

    it('should validate negative nutritional values', async () => {
      const foodWithNegativeCalories = new Food({
        name: 'Test Food',
        category: 'protein',
        nutritionalInfo: {
          calories: -100,
        },
      });

      let error;
      try {
        await foodWithNegativeCalories.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors['nutritionalInfo.calories']).toBeDefined();
    });

    it('should allow optional nutritional info fields', async () => {
      const food = new Food({
        name: 'Simple Food',
        category: 'fruits',
      });

      const savedFood = await food.save();

      expect(savedFood.nutritionalInfo).toBeDefined();
      expect(savedFood.nutritionalInfo.calories).toBeUndefined();
      expect(savedFood.nutritionalInfo.protein).toBeUndefined();
    });

    it('should set isActive to true by default', async () => {
      const food = new Food({
        name: 'Test Food',
        category: 'vegetables',
      });

      const savedFood = await food.save();

      expect(savedFood.isActive).toBe(true);
    });

    it('should allow isActive to be set to false', async () => {
      const food = new Food({
        name: 'Test Food',
        category: 'vegetables',
        isActive: false,
      });

      const savedFood = await food.save();

      expect(savedFood.isActive).toBe(false);
    });

    it('should handle allergens array', async () => {
      const food = new Food({
        name: 'Peanut Butter',
        category: 'fats',
        allergens: ['peanuts', 'nuts'],
      });

      const savedFood = await food.save();

      expect(savedFood.allergens).toHaveLength(2);
      expect(savedFood.allergens).toContain('peanuts');
      expect(savedFood.allergens).toContain('nuts');
    });

    it('should handle tags array', async () => {
      const food = new Food({
        name: 'Organic Apple',
        category: 'fruits',
        tags: ['organic', 'fresh', 'local'],
      });

      const savedFood = await food.save();

      expect(savedFood.tags).toHaveLength(3);
      expect(savedFood.tags).toContain('organic');
      expect(savedFood.tags).toContain('fresh');
      expect(savedFood.tags).toContain('local');
    });

    it('should trim allergens and tags', async () => {
      const food = new Food({
        name: 'Test Food',
        category: 'protein',
        allergens: ['  peanuts  ', '  soy  '],
        tags: ['  healthy  ', '  organic  '],
      });

      const savedFood = await food.save();

      expect(savedFood.allergens[0]).toBe('peanuts');
      expect(savedFood.allergens[1]).toBe('soy');
      expect(savedFood.tags[0]).toBe('healthy');
      expect(savedFood.tags[1]).toBe('organic');
    });
  });

  describe('JSON transformation', () => {
    it('should remove __v field when converting to JSON', async () => {
      const food = new Food({
        name: 'Test Food',
        category: 'protein',
      });

      const savedFood = await food.save();
      const foodJSON = savedFood.toJSON();

      expect(foodJSON.__v).toBeUndefined();
      expect(foodJSON._id).toBeDefined();
      expect(foodJSON.name).toBe('Test Food');
    });
  });

  describe('Indexes', () => {
    it('should have index on name field', async () => {
      const indexes = Food.schema.indexes();
      const nameIndex = indexes.find((index) => index[0].name === 1);

      expect(nameIndex).toBeDefined();
    });

    it('should have index on category field', async () => {
      const indexes = Food.schema.indexes();
      const categoryIndex = indexes.find((index) => index[0].category === 1);

      expect(categoryIndex).toBeDefined();
    });

    it('should have index on tags field', async () => {
      const indexes = Food.schema.indexes();
      const tagsIndex = indexes.find((index) => index[0].tags === 1);

      expect(tagsIndex).toBeDefined();
    });
  });

  describe('Complete nutritional info', () => {
    it('should save all nutritional info fields correctly', async () => {
      const food = new Food({
        name: 'Complete Meal',
        category: 'protein',
        nutritionalInfo: {
          calories: 250,
          protein: 25,
          carbohydrates: 30,
          fat: 8,
          fiber: 5,
          sugar: 3,
        },
      });

      const savedFood = await food.save();

      expect(savedFood.nutritionalInfo.calories).toBe(250);
      expect(savedFood.nutritionalInfo.protein).toBe(25);
      expect(savedFood.nutritionalInfo.carbohydrates).toBe(30);
      expect(savedFood.nutritionalInfo.fat).toBe(8);
      expect(savedFood.nutritionalInfo.fiber).toBe(5);
      expect(savedFood.nutritionalInfo.sugar).toBe(3);
    });
  });
});
