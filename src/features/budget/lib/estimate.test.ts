import { describe, expect, it } from "vitest";

import { buildPriceMap, estimateList } from "./estimate";

describe("buildPriceMap", () => {
  it("moyenne le prix par produit (nom normalisé)", () => {
    const map = buildPriceMap([
      { name: "Lait", price: 1.2 },
      { name: "lait", price: 1.4 },
      { name: "Pain", price: 1.1 },
    ]);
    expect(map["lait"]).toBeCloseTo(1.3);
    expect(map["pain"]).toBeCloseTo(1.1);
  });

  it("ignore les prix nuls ou négatifs", () => {
    const map = buildPriceMap([
      { name: "sel", price: 0 },
      { name: "sel", price: null },
    ]);
    expect(map["sel"]).toBeUndefined();
  });
});

describe("estimateList", () => {
  const prices = { lait: 1.3, pain: 1.1, cafe: 2.5 };

  it("somme les prix connus et compte les inconnus", () => {
    const result = estimateList(["Lait", "Pain", "Chocolat"], prices);
    expect(result.total).toBeCloseTo(2.4);
    expect(result.matched).toBe(2);
    expect(result.unmatched).toBe(1);
  });

  it("rapprochement insensible aux accents/casse", () => {
    const result = estimateList(["Café"], prices);
    expect(result.matched).toBe(1);
    expect(result.total).toBeCloseTo(2.5);
  });

  it("liste sans correspondance -> total 0", () => {
    const result = estimateList(["Kiwi", "Mangue"], prices);
    expect(result).toEqual({ total: 0, matched: 0, unmatched: 2 });
  });
});
