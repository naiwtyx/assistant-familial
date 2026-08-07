import { describe, expect, it } from "vitest";

import { aggregateReceiptItems } from "./aggregate";

describe("aggregateReceiptItems", () => {
  it("retourne un total et une répartition vides sans lignes", () => {
    expect(aggregateReceiptItems([])).toEqual({ total: 0, byCategory: [] });
  });

  it("additionne les prix par catégorie", () => {
    const result = aggregateReceiptItems([
      { category: "food", price: 10 },
      { category: "food", price: 5.5 },
      { category: "hygiene", price: 3 },
    ]);
    expect(result.total).toBeCloseTo(18.5);
    expect(result.byCategory).toEqual([
      { category: "food", amount: 15.5 },
      { category: "hygiene", amount: 3 },
    ]);
  });

  it("trie les catégories par montant décroissant", () => {
    const result = aggregateReceiptItems([
      { category: "small", price: 1 },
      { category: "big", price: 100 },
    ]);
    expect(result.byCategory.map((row) => row.category)).toEqual(["big", "small"]);
  });

  it("regroupe les catégories nulles sous 'other'", () => {
    const result = aggregateReceiptItems([{ category: null, price: 4 }]);
    expect(result.byCategory).toEqual([{ category: "other", amount: 4 }]);
  });

  it("ignore les prix invalides (NaN -> 0)", () => {
    const result = aggregateReceiptItems([{ category: "food", price: "n/a" }]);
    expect(result.total).toBe(0);
    expect(result.byCategory).toEqual([{ category: "food", amount: 0 }]);
  });

  it("accepte des prix en chaîne numérique (venant de Supabase)", () => {
    const result = aggregateReceiptItems([{ category: "food", price: "12.30" }]);
    expect(result.total).toBeCloseTo(12.3);
  });
});
