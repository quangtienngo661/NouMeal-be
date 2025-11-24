const nutritionalProfilePercentages = {
  lose_weight: {
    protein: 0.4, // 40%
    carb: 0.3,    // 30%
    fat: 0.3,     // 30%
  },
  maintain_weight: {
    protein: 0.3, // 30%
    carb: 0.4,    // 40%
    fat: 0.3,     // 30%
  },
  improve_health: {
    protein: 0.3, // 30%
    carb: 0.4,    // 40%
    fat: 0.3,     // 30%
  },
  gain_weight: {
    protein: 0.3, // 30%
    carb: 0.5,    // 50%
    fat: 0.2,     // 20%
  },
  build_muscle: {
    protein: 0.3, // 30%
    carb: 0.5,    // 50%
    fat: 0.2,     // 20%
  },
};

exports.nutritiousFoodConditions = (user) => {
  let bmr;
  if (user.gender === 'male') {
    bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age + 5;
  } else {
    bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age - 161;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };

  const tdee = bmr * activityMultipliers[user.activity];

  let totalCalories;

  switch (user.goal) {
    case 'lose_weight':
      totalCalories = tdee - 500;
      break;
    case 'maintain_weight':
      totalCalories = tdee;
      break;
    case 'gain_weight':
      totalCalories = tdee + 500;
      break;
    case 'build_muscle':
      totalCalories = tdee + 300;
      break;
    case 'improve_health':
      totalCalories = tdee;
      break;
    default:
      totalCalories = tdee;
  }

  const percentages = nutritionalProfilePercentages[user.goal];

  const proteinGrams = (totalCalories * percentages.protein) / 4;
  const carbGrams = (totalCalories * percentages.carb) / 4;
  const fatGrams = (totalCalories * percentages.fat) / 9;

  const macroProfileInGrams = {
    protein: Math.round(proteinGrams),
    carb: Math.round(carbGrams),
    fat: Math.round(fatGrams),
  };

  return { totalCalories, macroProfile: macroProfileInGrams };
};



exports.aggregateConditions = (user, meal, allergensCondition) => {
  let ratio;
  switch (meal) {
    case 'breakfast':
      ratio = 0.3;
      break;
    case 'lunch':
      ratio = 0.4;
      break;
    case 'dinner':
      ratio = 0.3;
      break;
    default:
      ratio = 0.2;
  }

  // console.log(user)

  const { totalCalories, macroProfile } = this.nutritiousFoodConditions(user);

  const idealCalories = totalCalories * ratio;
  const idealProtein = macroProfile.protein * ratio;
  const idealCarb = macroProfile.carb * ratio;
  const idealFat = macroProfile.fat * ratio;

  return [
    {
      $match: {
        meal,
        ...allergensCondition,
      }
    },
    {
      $addFields: {
        calorieDiff: { $abs: { $subtract: ["$nutritionalInfo.calories", idealCalories] } },
        proteinDiff: { $abs: { $subtract: ["$nutritionalInfo.protein", idealProtein] } },
        carbDiff: { $abs: { $subtract: ["$nutritionalInfo.carbohydrates", idealCarb] } },
        fatDiff: { $abs: { $subtract: ["$nutritionalInfo.fat", idealFat] } },
      }
    },
    {
      $addFields: {
        totalDiff: {
          $add: [
            { $multiply: ["$calorieDiff", 2] }, // Calo x2
            "$proteinDiff",
            "$carbDiff",
            "$fatDiff"
          ]
        }
      }
    }, 
    {
      $sort: { totalDiff: 1 }
    }, 
    {
      $limit: 5
    }
  ]
}