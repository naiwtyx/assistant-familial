import { z } from "zod";

export const addShoppingItemSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120, "120 caractères maximum"),
  quantity: z.number().positive("Quantité invalide").max(9999),
  unit: z.string().optional(),
});

export type AddShoppingItemInput = z.infer<typeof addShoppingItemSchema>;

export const updateShoppingItemSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  quantity: z.number().positive().max(9999).optional(),
});

export type UpdateShoppingItemInput = z.infer<typeof updateShoppingItemSchema>;
