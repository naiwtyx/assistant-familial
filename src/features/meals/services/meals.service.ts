import { getInventory } from "@/features/inventory/services/inventory.service";
import { compareIngredientsWithInventory, type IngredientNeed } from "@/features/recipes/lib/compare";
import { addShoppingItems } from "@/features/shopping/services/shopping.service";
import { normalizeName } from "@/lib/normalize";
import { createClient } from "@/lib/supabase/client";
import type { MealPlan } from "@/types/db";

export type MealSlot = "midi" | "soir";
export type MealPlanWithRecipe = MealPlan & { recipeName: string | null };

/** Repas planifiés entre deux dates (incluses), enrichis du nom de la recette. */
export async function getMealPlans(
  familyId: string,
  startDate: string,
  endDate: string,
): Promise<MealPlanWithRecipe[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("family_id", familyId)
    .gte("date", startDate)
    .lte("date", endDate);
  if (error) throw error;

  const recipeIds = [...new Set(data.map((m) => m.recipe_id).filter(Boolean))] as string[];
  const byId = new Map<string, string>();
  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase
      .from("recipes")
      .select("id,name")
      .in("id", recipeIds);
    for (const recipe of recipes ?? []) byId.set(recipe.id, recipe.name);
  }

  return data.map((meal) => ({
    ...meal,
    recipeName: meal.recipe_id ? (byId.get(meal.recipe_id) ?? null) : null,
  }));
}

/** Assigne une recette à un créneau (crée ou remplace). */
export async function setMealRecipe(
  familyId: string,
  date: string,
  slot: MealSlot,
  recipeId: string,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("meal_plans").upsert(
    {
      family_id: familyId,
      date,
      slot,
      recipe_id: recipeId,
      created_by: user?.id ?? null,
    },
    { onConflict: "family_id,date,slot" },
  );
  if (error) throw error;
}

/** Vide un créneau. */
export async function clearMeal(familyId: string, date: string, slot: MealSlot): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("meal_plans")
    .delete()
    .eq("family_id", familyId)
    .eq("date", date)
    .eq("slot", slot);
  if (error) throw error;
}

/**
 * Ajoute à la liste de courses uniquement les ingrédients MANQUANTS des recettes
 * planifiées (comparés à l'inventaire). Agrège les doublons entre repas.
 * Retourne le nombre d'articles ajoutés.
 */
export async function addPlannedIngredientsToShopping(
  familyId: string,
  recipeIds: string[],
): Promise<number> {
  const uniqueRecipeIds = [...new Set(recipeIds)];
  if (uniqueRecipeIds.length === 0) return 0;

  const supabase = createClient();
  const { data: ingredients, error } = await supabase
    .from("recipe_ingredients")
    .select("name,quantity,unit")
    .in("recipe_id", uniqueRecipeIds);
  if (error) throw error;

  const aggregated = new Map<string, IngredientNeed>();
  for (const ingredient of ingredients ?? []) {
    const key = normalizeName(ingredient.name);
    const existing = aggregated.get(key);
    if (existing) existing.quantity += ingredient.quantity;
    else
      aggregated.set(key, {
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      });
  }
  const needs = [...aggregated.values()];
  if (needs.length === 0) return 0;

  const inventory = await getInventory(familyId);
  const missing = compareIngredientsWithInventory(needs, inventory)
    .filter((row) => row.status !== "in_stock")
    .map((row) => ({
      name: row.name,
      quantity: Math.max(1, Math.ceil(row.missing)),
      unit: row.unit,
    }));

  await addShoppingItems(familyId, missing);
  return missing.length;
}

/**
 * « J'ai cuisiné ce repas » : déduit de l'inventaire les ingrédients de la recette
 * (rapprochement par nom). Retourne le nombre de produits mis à jour.
 */
export async function cookMeal(familyId: string, recipeId: string): Promise<number> {
  const supabase = createClient();
  const { data: ingredients, error } = await supabase
    .from("recipe_ingredients")
    .select("name,quantity")
    .eq("recipe_id", recipeId);
  if (error) throw error;
  if (!ingredients || ingredients.length === 0) return 0;

  const inventory = await getInventory(familyId);
  const inventoryByName = new Map(inventory.map((item) => [normalizeName(item.name), item]));

  let updated = 0;
  for (const ingredient of ingredients) {
    const item = inventoryByName.get(normalizeName(ingredient.name));
    if (!item) continue;
    const next = Math.max(0, item.quantity - ingredient.quantity);
    if (next === item.quantity) continue;
    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ quantity: next })
      .eq("id", item.id);
    if (updateError) throw updateError;
    updated += 1;
  }
  return updated;
}
