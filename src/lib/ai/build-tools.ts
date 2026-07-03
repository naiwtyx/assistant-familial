import "server-only";

import type Groq from "groq-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

type Db = SupabaseClient<Database>;
type Executor = (args: Record<string, unknown>) => Promise<string>;

/**
 * Déclarations des fonctions exposées à l'IA (format OpenAI/Groq). Elles
 * décrivent ce que l'assistant peut faire ; l'exécution réelle est dans
 * buildExecutors.
 */
export const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getShoppingList",
      description: "Récupère la liste de courses de la famille (à acheter et déjà pris).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "addShoppingItem",
      description: "Ajoute un article à la liste de courses.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom de l'article" },
          quantity: { type: "number", description: "Quantité (1 par défaut)" },
          unit: { type: "string", description: "Unité, ex. kg, L, paquet" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "removeShoppingItem",
      description: "Supprime un article de la liste de courses par son nom.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Nom de l'article à supprimer" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getInventory",
      description: "Récupère l'inventaire de la maison (produits en stock).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "updateInventory",
      description: "Met à jour la quantité d'un produit de l'inventaire (recherché par son nom).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom du produit" },
          quantity: { type: "number", description: "Nouvelle quantité" },
        },
        required: ["name", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getRecipes",
      description: "Liste les recettes de la famille (nom, nombre de personnes).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "createRecipe",
      description: "Crée une nouvelle recette avec ses ingrédients.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom de la recette" },
          servings: { type: "number", description: "Nombre de personnes (4 par défaut)" },
          ingredients: {
            type: "array",
            description: "Liste des ingrédients",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
              },
              required: ["name", "quantity"],
            },
          },
        },
        required: ["name", "ingredients"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMealPlan",
      description:
        "Récupère les repas planifiés entre deux dates incluses (format AAAA-MM-JJ).",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Date de début, AAAA-MM-JJ" },
          endDate: { type: "string", description: "Date de fin, AAAA-MM-JJ" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "planMeal",
      description:
        "Planifie une recette existante pour un repas (midi ou soir) à une date. Vérifie les recettes avec getRecipes si besoin.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date du repas, AAAA-MM-JJ" },
          slot: { type: "string", enum: ["midi", "soir"], description: "Créneau du repas" },
          recipeName: { type: "string", description: "Nom de la recette à planifier" },
        },
        required: ["date", "slot", "recipeName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clearMeal",
      description: "Retire le repas planifié pour une date et un créneau (midi ou soir).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date du repas, AAAA-MM-JJ" },
          slot: { type: "string", enum: ["midi", "soir"], description: "Créneau du repas" },
        },
        required: ["date", "slot"],
      },
    },
  },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function asSlot(value: unknown): "midi" | "soir" | null {
  return value === "midi" || value === "soir" ? value : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Implémentations des outils. Exécutées CÔTÉ SERVEUR avec le client Supabase de
 * l'utilisateur : les RLS et le filtrage par famille s'appliquent — l'IA ne peut
 * jamais sortir des données de sa famille.
 */
export function buildExecutors(supabase: Db, familyId: string, userId: string): Record<string, Executor> {
  return {
    getShoppingList: async () => {
      const { data, error } = await supabase
        .from("shopping_items")
        .select("name,quantity,unit,is_checked")
        .eq("family_id", familyId)
        .order("is_checked")
        .order("created_at");
      if (error) throw error;
      return JSON.stringify(data);
    },

    addShoppingItem: async (args) => {
      const name = asString(args.name);
      if (!name) return "Nom d'article manquant.";
      const quantity = asNumber(args.quantity, 1);
      const unit = args.unit ? asString(args.unit) : null;
      const { error } = await supabase.from("shopping_items").insert({
        family_id: familyId,
        name,
        quantity,
        unit,
        created_by: userId,
      });
      if (error) throw error;
      return `Ajouté à la liste de courses : ${quantity} ${unit ?? ""} ${name}`.replace(/\s+/g, " ").trim();
    },

    removeShoppingItem: async (args) => {
      const name = asString(args.name);
      const { data, error } = await supabase
        .from("shopping_items")
        .delete()
        .eq("family_id", familyId)
        .ilike("name", name)
        .select("id");
      if (error) throw error;
      return `Supprimé : ${data?.length ?? 0} article(s) « ${name} ».`;
    },

    getInventory: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("name,category,quantity,unit,location,expiry_date")
        .eq("family_id", familyId)
        .order("name");
      if (error) throw error;
      return JSON.stringify(data);
    },

    updateInventory: async (args) => {
      const name = asString(args.name);
      const quantity = asNumber(args.quantity, 0);
      const { data, error } = await supabase
        .from("inventory_items")
        .update({ quantity })
        .eq("family_id", familyId)
        .ilike("name", name)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) return `Aucun produit « ${name} » trouvé dans l'inventaire.`;
      return `Quantité de « ${name} » mise à jour : ${quantity}.`;
    },

    getRecipes: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id,name,servings")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return JSON.stringify(data);
    },

    createRecipe: async (args) => {
      const name = asString(args.name);
      const servings = Math.max(1, Math.round(asNumber(args.servings, 4)));
      const rawIngredients = Array.isArray(args.ingredients) ? args.ingredients : [];
      const ingredients = rawIngredients
        .map((item) => {
          const ingredient = item as Record<string, unknown>;
          return {
            name: asString(ingredient.name),
            quantity: asNumber(ingredient.quantity, 1),
            unit: ingredient.unit ? asString(ingredient.unit) : null,
          };
        })
        .filter((ingredient) => ingredient.name.length > 0);

      if (!name || ingredients.length === 0) {
        return "Il faut au moins un nom de recette et un ingrédient.";
      }

      const { data: recipe, error } = await supabase
        .from("recipes")
        .insert({ family_id: familyId, name, servings, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;

      const rows = ingredients.map((ingredient, index) => ({
        recipe_id: recipe.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        sort_order: index,
      }));
      const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(rows);
      if (ingredientsError) {
        await supabase.from("recipes").delete().eq("id", recipe.id);
        throw ingredientsError;
      }

      return `Recette « ${name} » créée pour ${servings} personnes (${ingredients.length} ingrédient(s)).`;
    },

    getMealPlan: async (args) => {
      const startDate = asString(args.startDate);
      const endDate = asString(args.endDate);
      if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
        return "Dates invalides (format attendu : AAAA-MM-JJ).";
      }
      const { data, error } = await supabase
        .from("meal_plans")
        .select("date,slot,recipe_id")
        .eq("family_id", familyId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date");
      if (error) throw error;

      const recipeIds = [...new Set((data ?? []).map((m) => m.recipe_id).filter(Boolean))] as string[];
      const nameById = new Map<string, string>();
      if (recipeIds.length > 0) {
        const { data: recipes } = await supabase
          .from("recipes")
          .select("id,name")
          .in("id", recipeIds);
        for (const recipe of recipes ?? []) nameById.set(recipe.id, recipe.name);
      }

      return JSON.stringify(
        (data ?? []).map((meal) => ({
          date: meal.date,
          slot: meal.slot,
          recipe: meal.recipe_id ? (nameById.get(meal.recipe_id) ?? null) : null,
        })),
      );
    },

    planMeal: async (args) => {
      const date = asString(args.date);
      const slot = asSlot(args.slot);
      const recipeName = asString(args.recipeName);
      if (!ISO_DATE.test(date)) return "Date invalide (format attendu : AAAA-MM-JJ).";
      if (!slot) return "Le créneau doit être « midi » ou « soir ».";
      if (!recipeName) return "Nom de recette manquant.";

      const { data: recipes, error: recipeError } = await supabase
        .from("recipes")
        .select("id,name")
        .eq("family_id", familyId)
        .ilike("name", recipeName)
        .limit(1);
      if (recipeError) throw recipeError;
      const recipe = recipes?.[0];
      if (!recipe) {
        return `Aucune recette « ${recipeName} » trouvée. Crée-la d'abord ou vérifie le nom avec getRecipes.`;
      }

      const { error } = await supabase.from("meal_plans").upsert(
        { family_id: familyId, date, slot, recipe_id: recipe.id, created_by: userId },
        { onConflict: "family_id,date,slot" },
      );
      if (error) throw error;
      return `Repas planifié : « ${recipe.name} » le ${date} (${slot}).`;
    },

    clearMeal: async (args) => {
      const date = asString(args.date);
      const slot = asSlot(args.slot);
      if (!ISO_DATE.test(date)) return "Date invalide (format attendu : AAAA-MM-JJ).";
      if (!slot) return "Le créneau doit être « midi » ou « soir ».";
      const { data, error } = await supabase
        .from("meal_plans")
        .delete()
        .eq("family_id", familyId)
        .eq("date", date)
        .eq("slot", slot)
        .select("id");
      if (error) throw error;
      return `Repas retiré : ${data?.length ?? 0} créneau (${date}, ${slot}).`;
    },
  };
}
