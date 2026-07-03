"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRealtimeTable } from "@/hooks/use-realtime-table";

import { addDays, toISODate } from "../lib/week";
import {
  addPlannedIngredientsToShopping,
  clearMeal,
  getMealPlans,
  setMealRecipe,
  type MealSlot,
} from "../services/meals.service";

export const mealsKeys = {
  all: (familyId: string) => ["meal-plans", familyId] as const,
  week: (familyId: string, weekStart: string) => ["meal-plans", familyId, weekStart] as const,
};

export function useMealPlans(familyId: string, weekStart: string) {
  const weekEnd = toISODate(addDays(new Date(`${weekStart}T00:00:00`), 6));
  const query = useQuery({
    queryKey: mealsKeys.week(familyId, weekStart),
    queryFn: () => getMealPlans(familyId, weekStart, weekEnd),
  });
  // Préfixe -> invalide toutes les semaines en cache à chaque changement.
  useRealtimeTable("meal_plans", familyId, mealsKeys.all(familyId));
  return query;
}

function useInvalidate(familyId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: mealsKeys.all(familyId) });
}

export function useSetMealRecipe(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: ({ date, slot, recipeId }: { date: string; slot: MealSlot; recipeId: string }) =>
      setMealRecipe(familyId, date, slot, recipeId),
    onSettled: invalidate,
  });
}

export function useClearMeal(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: ({ date, slot }: { date: string; slot: MealSlot }) =>
      clearMeal(familyId, date, slot),
    onSettled: invalidate,
  });
}

export function useAddPlannedToShopping(familyId: string) {
  return useMutation({
    mutationFn: (recipeIds: string[]) => addPlannedIngredientsToShopping(familyId, recipeIds),
  });
}
