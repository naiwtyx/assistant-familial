import { normalizeName } from "@/lib/normalize";

/**
 * Croise la liste de courses avec l'inventaire : combien d'articles « à acheter »
 * sont en réalité déjà en stock. Sert à éviter les achats en double (insight
 * contextuel). Rapprochement par nom normalisé (accents/casse/espaces ignorés).
 */
export function countAlreadyInStock(
  toBuy: { name: string }[],
  inventory: { name: string; quantity: number }[],
): { count: number; names: string[] } {
  const inStock = new Set(
    inventory.filter((item) => item.quantity > 0).map((item) => normalizeName(item.name)),
  );
  const matched = toBuy.filter((item) => inStock.has(normalizeName(item.name)));
  return { count: matched.length, names: matched.map((item) => item.name) };
}
