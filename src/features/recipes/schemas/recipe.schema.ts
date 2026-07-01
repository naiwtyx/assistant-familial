import { z } from "zod";

export const recipeIngredientSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120, "120 caractères maximum"),
  quantity: z.number().positive("Quantité invalide").max(99999),
  unit: z.string().trim().max(20).optional(),
});

export const recipeSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120, "120 caractères maximum"),
  servings: z.number().int().min(1, "Au moins 1 personne").max(50),
  ingredients: z.array(recipeIngredientSchema).min(1, "Ajoute au moins un ingrédient"),
});

export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;
export type RecipeInput = z.infer<typeof recipeSchema>;
