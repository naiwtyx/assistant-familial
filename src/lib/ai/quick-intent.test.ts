import { describe, expect, it } from "vitest";

import { parseQuickIntent } from "./quick-intent";

describe("parseQuickIntent — courses", () => {
  it("un seul article", () => {
    expect(parseQuickIntent("ajoute du lait aux courses")).toEqual({
      kind: "add_shopping",
      items: [{ name: "lait", quantity: 1, unit: null }],
    });
  });

  it("plusieurs articles séparés par « et »", () => {
    const result = parseQuickIntent("ajoute du lait et des œufs aux courses");
    expect(result?.kind).toBe("add_shopping");
    if (result?.kind === "add_shopping") {
      expect(result.items.map((i) => i.name)).toEqual(["lait", "œufs"]);
    }
  });

  it("variante « à la liste »", () => {
    const result = parseQuickIntent("mets du beurre à la liste");
    expect(result?.kind).toBe("add_shopping");
    if (result?.kind === "add_shopping") expect(result.items[0]?.name).toBe("beurre");
  });

  it("virgules + et", () => {
    const result = parseQuickIntent("ajoute tomates, pâtes et fromage aux courses");
    expect(result?.kind).toBe("add_shopping");
    if (result?.kind === "add_shopping") {
      expect(result.items.map((i) => i.name)).toEqual(["tomates", "pâtes", "fromage"]);
    }
  });

  it("ne matche pas une demande qui n'est pas une addition aux courses", () => {
    // « pour les courses » n'est pas « aux courses » -> laissé à l'IA.
    expect(parseQuickIntent("ajoute une tâche pour préparer les courses")).toBeNull();
  });
});

describe("parseQuickIntent — semaine", () => {
  it("organise ma semaine", () => {
    expect(parseQuickIntent("organise ma semaine")).toEqual({ kind: "plan_week" });
  });

  it("planifie mes repas de la semaine", () => {
    expect(parseQuickIntent("planifie mes repas de la semaine")).toEqual({ kind: "plan_week" });
  });
});

describe("parseQuickIntent — reste à l'IA", () => {
  it("question générale -> null", () => {
    expect(parseQuickIntent("que puis-je cuisiner ce soir ?")).toBeNull();
  });
  it("chaîne vide -> null", () => {
    expect(parseQuickIntent("   ")).toBeNull();
  });
});
