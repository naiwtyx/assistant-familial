import { z } from "zod";

import {
  PRODUCT_CATEGORY_VALUES,
  STORAGE_LOCATION_VALUES,
  UNIT_VALUES,
} from "@/config/constants";

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120, "120 caractères maximum"),
  category: z.enum(PRODUCT_CATEGORY_VALUES),
  quantity: z.number().min(0, "Quantité invalide").max(99999),
  unit: z.enum(UNIT_VALUES),
  location: z.enum(STORAGE_LOCATION_VALUES),
  /** Date ISO "YYYY-MM-DD" ou chaîne vide (= pas de date). */
  expiryDate: z.string().optional(),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
