import { z } from "zod";

export const recipeIngredientSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120, "120 caractères maximum"),
  quantity: z.number().positive("Quantité invalide").max(99999),
  unit: z.string().trim().max(20).optional(),
});

export const recipeSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120, "120 caractères maximum"),
  servings: z.number().int().min(1, "Au moins 1 personne").max(50),
  // Ingrédients optionnels : on peut créer un contenant "Pâtes au steak" et
  // compléter plus tard, ou laisser l'IA le faire à la demande.
  ingredients: z.array(recipeIngredientSchema).default([]),
});

export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;
export type RecipeInput = z.infer<typeof recipeSchema>;
