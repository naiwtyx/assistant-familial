"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRealtimeTable } from "@/hooks/use-realtime-table";

import type { RecipeInput } from "../schemas/recipe.schema";
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  getRecipes,
  updateRecipe,
} from "../services/recipe.service";

export const recipesKeys = {
  list: (familyId: string) => ["recipes", familyId] as const,
  detail: (recipeId: string) => ["recipe", recipeId] as const,
};

export function useRecipes(familyId: string) {
  const query = useQuery({
    queryKey: recipesKeys.list(familyId),
    queryFn: () => getRecipes(familyId),
  });

  useRealtimeTable("recipes", familyId, recipesKeys.list(familyId));

  return query;
}

export function useRecipe(recipeId: string) {
  return useQuery({
    queryKey: recipesKeys.detail(recipeId),
    queryFn: () => getRecipe(recipeId),
  });
}

export function useCreateRecipe(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecipeInput) => createRecipe(familyId, input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: recipesKeys.list(familyId) });
    },
  });
}

export function useUpdateRecipe(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecipeInput }) => updateRecipe(id, input),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: recipesKeys.list(familyId) });
      void queryClient.invalidateQueries({ queryKey: recipesKeys.detail(variables.id) });
    },
  });
}

export function useDeleteRecipe(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: recipesKeys.list(familyId) });
    },
  });
}
