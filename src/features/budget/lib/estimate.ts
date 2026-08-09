import { normalizeName } from "@/lib/normalize";

/**
 * Estimation du coût d'une liste de courses à partir de l'historique de prix
 * (tickets scannés). Rapprochement par nom normalisé. Honnête : on distingue
 * les articles réellement estimés de ceux inconnus, pour ne pas afficher un
 * total trompeur (§ 26 de la vision).
 */
export type ListEstimate = {
  total: number; // somme des prix connus
  matched: number; // nb d'articles avec un prix historique
  unmatched: number; // nb d'articles sans historique (non chiffrés)
};

export function estimateList(
  itemNames: string[],
  priceByName: Record<string, number>,
): ListEstimate {
  let total = 0;
  let matched = 0;
  let unmatched = 0;
  for (const name of itemNames) {
    const price = priceByName[normalizeName(name)];
    if (typeof price === "number" && price > 0) {
      total += price;
      matched += 1;
    } else {
      unmatched += 1;
    }
  }
  return { total, matched, unmatched };
}

/**
 * Construit la table « nom normalisé -> prix typique » à partir des lignes de
 * tickets : moyenne du prix observé pour chaque produit.
 */
export function buildPriceMap(
  items: { name: string; price: number | null }[],
): Record<string, number> {
  const sums = new Map<string, { sum: number; count: number }>();
  for (const item of items) {
    const price = Number(item.price) || 0;
    if (price <= 0 || !item.name) continue;
    const key = normalizeName(item.name);
    const existing = sums.get(key);
    if (existing) {
      existing.sum += price;
      existing.count += 1;
    } else {
      sums.set(key, { sum: price, count: 1 });
    }
  }
  const map: Record<string, number> = {};
  for (const [key, { sum, count }] of sums) map[key] = sum / count;
  return map;
}
