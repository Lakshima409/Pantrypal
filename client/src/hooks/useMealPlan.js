import { useMealPlan } from '../context/MealPlanContext';

export function useMealPlanState() {
  return useMealPlan();
}

export default useMealPlanState;

