import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getExpiryStatus } from "@/features/inventory/lib/expiry";
import { compareIngredientsWithInventory, type IngredientNeed } from "@/features/recipes/lib/compare";
import { normalizeName } from "@/lib/normalize";
import type { Database } from "@/types/database.types";
import type { InventoryItem } from "@/types/db";

type Db = SupabaseClient<Database>;

export type WeekSlot = { date: string; slot: "midi" | "soir"; recipeId: string; recipeName: string };
export type MissingIngredient = { name: string; quantity: number; unit: string | null };

export type WeekPlan = {
  startIso: string;
  endIso: string;
  slots: WeekSlot[];
  recipesUsed: number;
  prioritized: string[]; // recettes choisies car elles écoulent des produits qui périment
  missing: MissingIngredient[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Calcule une proposition de semaine (14 repas) SANS rien écrire.
 * Priorise les recettes dont des ingrédients périment bientôt (anti-gaspi),
 * puis calcule les ingrédients manquants vs l'inventaire. Le résultat est
 * présenté à l'utilisateur ; l'écriture ne se fait qu'après confirmation.
 */
export async function computeWeekPlan(
  supabase: Db,
  familyId: string,
  startDate: string,
): Promise<WeekPlan | { error: string }> {
  if (!ISO_DATE.test(startDate)) return { error: "Date de début invalide (AAAA-MM-JJ)." };

  const { data: recipes, error: recipesError } = await supabase
    .from("recipes")
    .select("id,name")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
  if (recipesError) throw recipesError;
  if (!recipes || recipes.length === 0) {
    return { error: "Aucune recette disponible. Crée d'abord quelques recettes." };
  }

  const recipeIds = recipes.map((recipe) => recipe.id);
  const [ingredientsResult, inventoryResult] = await Promise.all([
    supabase.from("recipe_ingredients").select("recipe_id,name,quantity,unit").in("recipe_id", recipeIds),
    supabase.from("inventory_items").select("*").eq("family_id", familyId),
  ]);
  if (ingredientsResult.error) throw ingredientsResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  const inventory = (inventoryResult.data ?? []) as InventoryItem[];
  const ingredients = ingredientsResult.data ?? [];

  const expiringNames = new Set(
    inventory
      .filter((item) => {
        const status = getExpiryStatus(item.expiry_date);
        return status === "soon" || status === "expired";
      })
      .map((item) => normalizeName(item.name)),
  );

  const ingredientsByRecipe = new Map<string, { name: string; quantity: number; unit: string | null }[]>();
  for (const ingredient of ingredients) {
    const list = ingredientsByRecipe.get(ingredient.recipe_id) ?? [];
    list.push({ name: ingredient.name, quantity: ingredient.quantity, unit: ingredient.unit });
    ingredientsByRecipe.set(ingredient.recipe_id, list);
  }

  // Score = nombre d'ingrédients de la recette qui périment bientôt.
  const scored = recipes
    .map((recipe) => {
      const list = ingredientsByRecipe.get(recipe.id) ?? [];
      const score = list.filter((ing) => expiringNames.has(normalizeName(ing.name))).length;
      return { ...recipe, score };
    })
    .sort((a, b) => b.score - a.score);

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const endIso = end.toISOString().slice(0, 10);

  const slots: WeekSlot[] = [];
  let index = 0;
  for (let day = 0; day < 7; day += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + day);
    const iso = date.toISOString().slice(0, 10);
    for (const slot of ["midi", "soir"] as const) {
      const recipe = scored[index % scored.length]!;
      slots.push({ date: iso, slot, recipeId: recipe.id, recipeName: recipe.name });
      index += 1;
    }
  }

  // Ingrédients manquants : agrège les besoins des recettes utilisées puis
  // compare à l'inventaire (même logique que « ajouter aux courses »).
  const usedRecipeIds = new Set(slots.map((s) => s.recipeId));
  const aggregated = new Map<string, IngredientNeed>();
  for (const recipeId of usedRecipeIds) {
    for (const ing of ingredientsByRecipe.get(recipeId) ?? []) {
      const key = normalizeName(ing.name);
      const existing = aggregated.get(key);
      if (existing) existing.quantity += ing.quantity;
      else aggregated.set(key, { name: ing.name, quantity: ing.quantity, unit: ing.unit });
    }
  }

  const missing = compareIngredientsWithInventory([...aggregated.values()], inventory)
    .filter((row) => row.status !== "in_stock")
    .map((row) => ({ name: row.name, quantity: Math.max(1, Math.ceil(row.missing)), unit: row.unit }));

  const prioritized = scored.filter((recipe) => recipe.score > 0).map((recipe) => recipe.name);

  return {
    startIso: startDate,
    endIso,
    slots,
    recipesUsed: new Set(slots.map((s) => s.recipeId)).size,
    prioritized,
    missing,
  };
}
