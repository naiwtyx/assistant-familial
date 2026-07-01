import type { InventoryItem } from "@/types/db";

import { normalizeName } from "./normalize";

export type ComparisonStatus = "in_stock" | "partial" | "missing";

export type IngredientNeed = { name: string; quantity: number; unit: string | null };

export type ComparisonRow = {
  name: string;
  unit: string | null;
  needed: number;
  status: ComparisonStatus;
  /** Quantité disponible si comparable (mêmes unités), sinon null. */
  available: number | null;
  /** Quantité à acheter (0 si en stock). */
  missing: number;
};

function normalizeUnit(unit: string | null): string {
  return (unit ?? "").trim().toLowerCase();
}

/**
 * Compare les ingrédients (déjà ajustés au nombre de personnes) avec l'inventaire.
 *
 * Rapprochement par nom normalisé. Si le produit est présent :
 * - mêmes unités -> on compare les quantités (en stock / partiel) ;
 * - unités différentes -> on considère le produit "en stock" (comparaison
 *   chiffrée non fiable, mais on sait qu'on l'a).
 * Sinon -> manquant (quantité entière à acheter).
 */
export function compareIngredientsWithInventory(
  ingredients: IngredientNeed[],
  inventory: InventoryItem[],
): ComparisonRow[] {
  const inventoryByName = new Map<string, InventoryItem>();
  for (const item of inventory) {
    inventoryByName.set(normalizeName(item.name), item);
  }

  return ingredients.map((ingredient) => {
    const match = inventoryByName.get(normalizeName(ingredient.name));

    if (!match) {
      return {
        name: ingredient.name,
        unit: ingredient.unit,
        needed: ingredient.quantity,
        status: "missing",
        available: null,
        missing: ingredient.quantity,
      };
    }

    const comparable = normalizeUnit(ingredient.unit) === normalizeUnit(match.unit);

    if (!comparable || match.quantity >= ingredient.quantity) {
      return {
        name: ingredient.name,
        unit: ingredient.unit,
        needed: ingredient.quantity,
        status: "in_stock",
        available: comparable ? match.quantity : null,
        missing: 0,
      };
    }

    return {
      name: ingredient.name,
      unit: ingredient.unit,
      needed: ingredient.quantity,
      status: "partial",
      available: match.quantity,
      missing: ingredient.quantity - match.quantity,
    };
  });
}
