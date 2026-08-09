import { describe, expect, it } from "vitest";

import { confidenceLabel, detectDominantDay, detectMostFrequent } from "./detect";

describe("detectDominantDay", () => {
  it("retourne null en dessous du minimum d'observations", () => {
    expect(detectDominantDay(["2026-08-08", "2026-08-15"])).toBeNull();
  });

  it("détecte le samedi dominant (2026-08-08, -15, -22, -29 sont des samedis)", () => {
    const result = detectDominantDay(["2026-08-08", "2026-08-15", "2026-08-22", "2026-08-29"]);
    expect(result).not.toBeNull();
    expect(result?.value).toBe("6"); // 6 = samedi
    expect(result?.observations).toBe(4);
    expect(result?.confidence).toBe(1);
  });

  it("retourne null si aucune tendance nette (jours éparpillés)", () => {
    // lundi, mardi, mercredi, jeudi -> 25% chacun, sous le seuil de 40%.
    const result = detectDominantDay(["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"]);
    expect(result).toBeNull();
  });

  it("passe si la dominante dépasse le seuil malgré du bruit", () => {
    // 3 samedis + 1 lundi = 75% samedi.
    const result = detectDominantDay(["2026-08-08", "2026-08-15", "2026-08-22", "2026-08-10"]);
    expect(result?.value).toBe("6");
    expect(result?.confidence).toBeCloseTo(0.75);
  });
});

describe("detectMostFrequent", () => {
  it("retourne null sous le minimum d'observations", () => {
    expect(detectMostFrequent(["Pâtes", "Pizza"])).toBeNull();
  });

  it("détecte l'élément le plus fréquent (normalisé)", () => {
    const result = detectMostFrequent(["Pâtes carbonara", "pates carbonara", "Pizza", "Salade"]);
    expect(result?.value).toBe("Pâtes carbonara");
    expect(result?.observations).toBe(4);
    expect(result?.confidence).toBeCloseTo(0.5);
  });

  it("retourne null si tout est unique (rien de « fréquent »)", () => {
    expect(detectMostFrequent(["A", "B", "C", "D"])).toBeNull();
  });

  it("retourne null si la dominante est sous le seuil de confiance", () => {
    // « poulet » 2 fois sur 8 = 25% < 30%.
    const result = detectMostFrequent([
      "poulet",
      "poulet",
      "boeuf",
      "poisson",
      "porc",
      "agneau",
      "veau",
      "canard",
    ]);
    expect(result).toBeNull();
  });
});

describe("confidenceLabel", () => {
  it("mappe les seuils", () => {
    expect(confidenceLabel(0.9)).toBe("élevée");
    expect(confidenceLabel(0.6)).toBe("moyenne");
    expect(confidenceLabel(0.3)).toBe("faible");
  });
});
