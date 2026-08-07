import { describe, expect, it } from "vitest";

import { compareMonthlySpending, significantIncreases } from "./budget-insights";

describe("compareMonthlySpending", () => {
  it("calcule un delta positif", () => {
    const result = compareMonthlySpending(
      { total: 150, byCategory: [{ category: "food", amount: 150 }] },
      { total: 100, byCategory: [{ category: "food", amount: 100 }] },
    );
    expect(result.changeAmount).toBe(50);
    expect(result.changePercent).toBeCloseTo(50);
    expect(result.categories[0]).toEqual({
      category: "food",
      amount: 150,
      previousAmount: 100,
      changePercent: 50,
    });
  });

  it("gère un mois précédent à zéro (pas de pourcentage calculable)", () => {
    const result = compareMonthlySpending(
      { total: 80, byCategory: [{ category: "food", amount: 80 }] },
      { total: 0, byCategory: [] },
    );
    expect(result.changePercent).toBeNull();
    expect(result.categories[0]?.changePercent).toBeNull();
  });

  it("détecte une baisse", () => {
    const result = compareMonthlySpending(
      { total: 50, byCategory: [] },
      { total: 100, byCategory: [] },
    );
    expect(result.changeAmount).toBe(-50);
    expect(result.changePercent).toBeCloseTo(-50);
  });

  it("garde une catégorie disparue au mois précédent hors de la comparaison courante", () => {
    const result = compareMonthlySpending(
      { total: 10, byCategory: [{ category: "food", amount: 10 }] },
      { total: 20, byCategory: [{ category: "food", amount: 5 }, { category: "leisure", amount: 15 }] },
    );
    expect(result.categories).toEqual([
      { category: "food", amount: 10, previousAmount: 5, changePercent: 100 },
    ]);
  });
});

describe("significantIncreases", () => {
  it("ignore les petites variations", () => {
    const comparison = compareMonthlySpending(
      { total: 105, byCategory: [{ category: "food", amount: 105 }] },
      { total: 100, byCategory: [{ category: "food", amount: 100 }] },
    );
    expect(significantIncreases(comparison)).toEqual([]);
  });

  it("ignore une grosse variation en % si le montant reste négligeable", () => {
    const comparison = compareMonthlySpending(
      { total: 3, byCategory: [{ category: "misc", amount: 3 }] },
      { total: 1, byCategory: [{ category: "misc", amount: 1 }] },
    );
    expect(significantIncreases(comparison)).toEqual([]);
  });

  it("signale une catégorie en forte hausse", () => {
    const comparison = compareMonthlySpending(
      { total: 100, byCategory: [{ category: "leisure", amount: 100 }] },
      { total: 50, byCategory: [{ category: "leisure", amount: 50 }] },
    );
    expect(significantIncreases(comparison)).toEqual([
      { category: "leisure", amount: 100, previousAmount: 50, changePercent: 100 },
    ]);
  });

  it("ignore une catégorie nouvelle (pas de base de comparaison)", () => {
    const comparison = compareMonthlySpending(
      { total: 100, byCategory: [{ category: "new", amount: 100 }] },
      { total: 0, byCategory: [] },
    );
    expect(significantIncreases(comparison)).toEqual([]);
  });
});
