import { describe, expect, it } from "vitest";

import { buildProposedAction, writeToolToActionType } from "./actions-schema";

describe("writeToolToActionType", () => {
  it("mappe les outils d'écriture connus", () => {
    expect(writeToolToActionType("addShoppingItem")).toBe("add_shopping_item");
    expect(writeToolToActionType("planMeal")).toBe("plan_meal");
    expect(writeToolToActionType("createRecipe")).toBe("create_recipe");
  });

  it("retourne null pour les outils non gérés (lecture, suppression…)", () => {
    expect(writeToolToActionType("getShoppingList")).toBeNull();
    expect(writeToolToActionType("deleteChore")).toBeNull();
    expect(writeToolToActionType("planWeek")).toBeNull();
  });
});

describe("buildProposedAction — add_shopping_item", () => {
  it("rejette un nom vide", () => {
    const result = buildProposedAction("addShoppingItem", { name: "  " });
    expect(result.ok).toBe(false);
  });

  it("construit une action avec quantité par défaut 1 et libellé lisible", () => {
    const result = buildProposedAction("addShoppingItem", { name: "lait" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action.type).toBe("add_shopping_item");
      expect(result.action.params).toEqual({ name: "lait", quantity: 1, unit: null });
      expect(result.action.label).toBe("Ajouter lait aux courses");
    }
  });

  it("intègre quantité et unité dans le libellé", () => {
    const result = buildProposedAction("addShoppingItem", { name: "crème", quantity: 2, unit: "L" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.action.label).toBe("Ajouter 2 L crème aux courses");
  });

  it("plancher la quantité à 1", () => {
    const result = buildProposedAction("addShoppingItem", { name: "pain", quantity: 0 });
    expect(result.ok && result.action.params.quantity).toBe(1);
  });
});

describe("buildProposedAction — update_inventory", () => {
  it("exige une quantité", () => {
    expect(buildProposedAction("updateInventory", { name: "œufs" }).ok).toBe(false);
  });

  it("accepte une quantité à 0 (produit épuisé)", () => {
    const result = buildProposedAction("updateInventory", { name: "œufs", quantity: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.action.params.quantity).toBe(0);
  });
});

describe("buildProposedAction — plan_meal", () => {
  it("rejette une date non ISO", () => {
    expect(buildProposedAction("planMeal", { date: "demain", slot: "soir", recipeName: "Pâtes" }).ok).toBe(false);
  });

  it("rejette un créneau invalide", () => {
    expect(
      buildProposedAction("planMeal", { date: "2026-08-10", slot: "brunch", recipeName: "Pâtes" }).ok,
    ).toBe(false);
  });

  it("accepte une planification valide", () => {
    const result = buildProposedAction("planMeal", { date: "2026-08-10", slot: "soir", recipeName: "Pâtes" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action.params).toMatchObject({ date: "2026-08-10", slot: "soir", recipeName: "Pâtes" });
      expect(result.action.label).toContain("Planifier Pâtes");
    }
  });
});

describe("buildProposedAction — add_event", () => {
  it("exige un titre ET une date valide", () => {
    expect(buildProposedAction("addEvent", { title: "Dentiste" }).ok).toBe(false);
    expect(buildProposedAction("addEvent", { title: "", date: "2026-08-10" }).ok).toBe(false);
  });

  it("garde l'heure seulement si au format HH:MM", () => {
    const good = buildProposedAction("addEvent", { title: "Dentiste", date: "2026-08-10", time: "14:30" });
    expect(good.ok && good.action.params.time).toBe("14:30");
    const bad = buildProposedAction("addEvent", { title: "Dentiste", date: "2026-08-10", time: "14h" });
    expect(bad.ok && bad.action.params.time).toBeNull();
  });
});

describe("buildProposedAction — create_recipe", () => {
  it("crée une recette sans ingrédient", () => {
    const result = buildProposedAction("createRecipe", { name: "Pâtes au steak" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action.params.ingredients).toEqual([]);
      expect(result.action.label).toBe("Créer la recette « Pâtes au steak » (4 pers.)");
    }
  });

  it("filtre les ingrédients vides", () => {
    const result = buildProposedAction("createRecipe", {
      name: "Salade",
      ingredients: [{ name: "tomate", quantity: 2 }, { name: "  ", quantity: 1 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.action.params.ingredients as unknown[]).length).toBe(1);
  });
});

describe("buildProposedAction — inconnu", () => {
  it("rejette un outil non géré", () => {
    const result = buildProposedAction("deleteChore", { title: "x" });
    expect(result.ok).toBe(false);
  });
});
