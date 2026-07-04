import { describe, expect, it } from "vitest";

import { categorizeItem, groupByRayon } from "./categorize";

describe("categorizeItem", () => {
  it("classe les produits connus par mot-clé", () => {
    expect(categorizeItem("Lait demi-écrémé")).toBe("dairy");
    expect(categorizeItem("Pommes")).toBe("fruits_vegetables");
    expect(categorizeItem("Baguette")).toBe("bakery");
    expect(categorizeItem("Poulet rôti")).toBe("meat_fish");
  });

  it("retourne null pour un produit inconnu", () => {
    expect(categorizeItem("Zblorg")).toBeNull();
    expect(categorizeItem("")).toBeNull();
  });
});

describe("groupByRayon", () => {
  it("regroupe par rayon et place « Autre » en dernier", () => {
    const groups = groupByRayon([
      { category: null },
      { category: "dairy" },
      { category: "fruits_vegetables" },
    ]);
    expect(groups[0]?.key).toBe("fruits_vegetables");
    expect(groups[groups.length - 1]?.key).toBe("other");
  });
});
