import { describe, expect, it } from "vitest";

import type { InventoryItem } from "@/types/db";

import { compareIngredientsWithInventory } from "./compare";

function item(partial: Partial<InventoryItem>): InventoryItem {
  return {
    id: "x",
    family_id: "f",
    name: "",
    category: null,
    quantity: 0,
    unit: null,
    location: null,
    expiry_date: null,
    created_by: null,
    created_at: "",
    updated_at: "",
    ...partial,
  } as InventoryItem;
}

describe("compareIngredientsWithInventory", () => {
  it("marque manquant un ingrédient absent", () => {
    const rows = compareIngredientsWithInventory([{ name: "Oeufs", quantity: 6, unit: null }], []);
    expect(rows[0]?.status).toBe("missing");
    expect(rows[0]?.missing).toBe(6);
  });

  it("marque en stock si la quantité suffit", () => {
    const rows = compareIngredientsWithInventory(
      [{ name: "Lait", quantity: 1, unit: "l" }],
      [item({ name: "Lait", quantity: 2, unit: "l" })],
    );
    expect(rows[0]?.status).toBe("in_stock");
  });

  it("marque partiel s'il n'y en a pas assez", () => {
    const rows = compareIngredientsWithInventory(
      [{ name: "Farine", quantity: 500, unit: "g" }],
      [item({ name: "Farine", quantity: 200, unit: "g" })],
    );
    expect(rows[0]?.status).toBe("partial");
    expect(rows[0]?.missing).toBe(300);
  });
});
