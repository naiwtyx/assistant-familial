import { logActivity } from "@/features/activity/services/activity.service";
import { createClient } from "@/lib/supabase/client";
import type { Recipe, RecipeIngredient } from "@/types/db";

import type { RecipeInput } from "../schemas/recipe.schema";

export type RecipeWithIngredients = Recipe & { ingredients: RecipeIngredient[] };

/**
 * Couche métier "recettes" (UI + futur assistant IA : getRecipes, createRecipe…).
 * Une recette + ses ingrédients sont gérés ensemble.
 */

export async function getRecipes(familyId: string): Promise<Recipe[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRecipe(recipeId: string): Promise<RecipeWithIngredients> {
  const supabase = createClient();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .single();
  if (error) throw error;

  const { data: ingredients, error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true });
  if (ingredientsError) throw ingredientsError;

  return { ...recipe, ingredients };
}

function ingredientRows(recipeId: string, input: RecipeInput) {
  return input.ingredients.map((ingredient, index) => ({
    recipe_id: recipeId,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit && ingredient.unit.length > 0 ? ingredient.unit : null,
    sort_order: index,
  }));
}

export async function createRecipe(familyId: string, input: RecipeInput): Promise<Recipe> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      family_id: familyId,
      name: input.name,
      servings: input.servings,
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .insert(ingredientRows(recipe.id, input));

  if (ingredientsError) {
    // Pas de transaction côté client : on annule la recette pour ne pas laisser d'orphelin.
    await supabase.from("recipes").delete().eq("id", recipe.id);
    throw ingredientsError;
  }

  void logActivity(familyId, "recipe_add", { name: input.name });
  return recipe;
}

export async function updateRecipe(
  recipeId: string,
  input: RecipeInput,
): Promise<Recipe> {
  const supabase = createClient();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .update({ name: input.name, servings: input.servings })
    .eq("id", recipeId)
    .select()
    .single();
  if (error) throw error;

  // Stratégie simple : on remplace l'ensemble des ingrédients.
  const { error: deleteError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipeId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("recipe_ingredients")
    .insert(ingredientRows(recipeId, input));
  if (insertError) throw insertError;

  return recipe;
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const supabase = createClient();
  // Les ingrédients sont supprimés en cascade (FK on delete cascade).
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) throw error;
}
