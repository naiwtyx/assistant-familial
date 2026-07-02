import { normalizeName } from "@/lib/normalize";
import type { InventoryItem } from "@/types/db";

/**
 * Trouve les produits d'inventaire correspondant à un nom saisi.
 * Rapprochement souple : accents/casse/espaces ignorés, et correspondance si l'un
 * contient l'autre (ex. "lait" ↔ "lait demi-écrémé"). Ignore les saisies < 3 lettres.
 */
export function findInventoryMatches(query: string, inventory: InventoryItem[]): InventoryItem[] {
  const normalizedQuery = normalizeName(query);
  if (normalizedQuery.length < 3) return [];

  return inventory.filter((item) => {
    const normalizedName = normalizeName(item.name);
    return normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName);
  });
}
