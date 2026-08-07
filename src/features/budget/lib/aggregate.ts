export type ReceiptItemRow = { category: string | null; price: number | string | null };
export type CategoryTotal = { category: string; amount: number };

/** Agrège des lignes de ticket en total + répartition par catégorie (triée décroissante). */
export function aggregateReceiptItems(items: ReceiptItemRow[]): {
  total: number;
  byCategory: CategoryTotal[];
} {
  const totals = new Map<string, number>();
  let total = 0;
  for (const item of items) {
    const price = Number(item.price) || 0;
    total += price;
    const category = item.category ?? "other";
    totals.set(category, (totals.get(category) ?? 0) + price);
  }

  const byCategory = Array.from(totals, ([category, amount]) => ({ category, amount })).sort(
    (a, b) => b.amount - a.amount,
  );

  return { total, byCategory };
}
