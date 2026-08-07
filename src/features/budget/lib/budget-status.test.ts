import { describe, expect, it } from "vitest";

import { computeBudgetStatus } from "./budget-status";

describe("computeBudgetStatus", () => {
  it("ne signale rien sans plafond", () => {
    expect(computeBudgetStatus(500, null)).toEqual({
      overBudget: false,
      nearBudget: false,
      remaining: null,
      overage: null,
    });
  });

  it("ne signale rien avec un plafond à 0 (désactivé)", () => {
    expect(computeBudgetStatus(500, 0)).toEqual({
      overBudget: false,
      nearBudget: false,
      remaining: null,
      overage: null,
    });
  });

  it("reste sous le seuil d'alerte en dessous de 80%", () => {
    const status = computeBudgetStatus(70, 100);
    expect(status.overBudget).toBe(false);
    expect(status.nearBudget).toBe(false);
    expect(status.remaining).toBe(30);
  });

  it("passe en alerte à partir de 80% du plafond", () => {
    const status = computeBudgetStatus(80, 100);
    expect(status.overBudget).toBe(false);
    expect(status.nearBudget).toBe(true);
    expect(status.remaining).toBe(20);
  });

  it("passe en dépassement au-delà du plafond", () => {
    const status = computeBudgetStatus(120, 100);
    expect(status.overBudget).toBe(true);
    expect(status.nearBudget).toBe(false);
    expect(status.remaining).toBeNull();
    expect(status.overage).toBe(20);
  });

  it("n'est pas en dépassement pile au plafond", () => {
    const status = computeBudgetStatus(100, 100);
    expect(status.overBudget).toBe(false);
    expect(status.nearBudget).toBe(true);
  });
});
