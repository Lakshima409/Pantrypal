export function calculateNutrition(ingredients = [], servings = 1) {
  const totals = ingredients.reduce(
    (acc, item) => {
      const amount = Number(item.amount) || 0;
      acc.calories += amount * 1.2;
      acc.protein += amount * 0.05;
      acc.carbs += amount * 0.12;
      acc.fat += amount * 0.03;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const divisor = Math.max(1, Number(servings) || 1);
  const round = (value) => Math.round((value / divisor) * 10) / 10;
  return {
    calories: round(totals.calories),
    protein: round(totals.protein),
    carbs: round(totals.carbs),
    fat: round(totals.fat),
  };
}

export default calculateNutrition;

