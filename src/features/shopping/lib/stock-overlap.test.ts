import { describe, expect, it } from "vitest";

import { countAlreadyInStock } from "./stock-overlap";

describe("countAlreadyInStock", () => {
  it("retourne 0 quand rien ne correspond", () => {
    const result = countAlreadyInStock([{ name: "lait" }], [{ name: "pain", quantity: 2 }]);
    expect(result).toEqual({ count: 0, names: [] });
  });

  it("détecte un article déjà en stock (nom normalisé)", () => {
    const result = countAlreadyInStock(
      [{ name: "Lait" }, { name: "œufs" }],
      [{ name: "  lait  ", quantity: 1 }],
    );
    expect(result.count).toBe(1);
    expect(result.names).toEqual(["Lait"]);
  });

  it("ignore accents et casse", () => {
    const result = countAlreadyInStock([{ name: "CREME" }], [{ name: "crème", quantity: 1 }]);
    expect(result.count).toBe(1);
  });

  it("ignore les produits en stock à quantité 0 (épuisés)", () => {
    const result = countAlreadyInStock([{ name: "beurre" }], [{ name: "beurre", quantity: 0 }]);
    expect(result.count).toBe(0);
  });

  it("compte plusieurs correspondances", () => {
    const result = countAlreadyInStock(
      [{ name: "lait" }, { name: "pain" }, { name: "sel" }],
      [
        { name: "lait", quantity: 1 },
        { name: "pain", quantity: 2 },
      ],
    );
    expect(result.count).toBe(2);
    expect(result.names).toEqual(["lait", "pain"]);
  });
});
