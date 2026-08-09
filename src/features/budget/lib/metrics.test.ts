import { describe, expect, it } from "vitest";

import { averageBasket, mondayOf, projectMonthEnd, toLocalIso, weeklyBuckets } from "./metrics";

describe("mondayOf", () => {
  it("renvoie le lundi de la semaine", () => {
    // 2026-08-08 est un samedi -> lundi = 2026-08-03.
    expect(toLocalIso(mondayOf(new Date("2026-08-08T12:00:00")))).toBe("2026-08-03");
    // un lundi reste le même jour.
    expect(toLocalIso(mondayOf(new Date("2026-08-03T12:00:00")))).toBe("2026-08-03");
    // dimanche -> lundi précédent.
    expect(toLocalIso(mondayOf(new Date("2026-08-09T12:00:00")))).toBe("2026-08-03");
  });
});

describe("weeklyBuckets", () => {
  const today = new Date("2026-08-12T12:00:00"); // mercredi ; lundi = 2026-08-10

  it("crée le bon nombre de semaines, la courante en dernier", () => {
    const buckets = weeklyBuckets([], 4, today);
    expect(buckets).toHaveLength(4);
    expect(buckets[3]!.weekStartIso).toBe("2026-08-10");
    expect(buckets[0]!.weekStartIso).toBe("2026-07-20");
    expect(buckets.every((b) => b.total === 0)).toBe(true);
  });

  it("agrège les tickets dans la bonne semaine", () => {
    const buckets = weeklyBuckets(
      [
        { purchased_at: "2026-08-11", total: 30 }, // semaine courante
        { purchased_at: "2026-08-12", total: 20 }, // semaine courante
        { purchased_at: "2026-08-04", total: 50 }, // semaine préc. (lundi 03)
      ],
      4,
      today,
    );
    expect(buckets[3]!.total).toBe(50); // courante
    expect(buckets[2]!.weekStartIso).toBe("2026-08-03");
    expect(buckets[2]!.total).toBe(50);
  });

  it("ignore les tickets hors fenêtre", () => {
    const buckets = weeklyBuckets([{ purchased_at: "2026-06-01", total: 99 }], 4, today);
    expect(buckets.reduce((s, b) => s + b.total, 0)).toBe(0);
  });
});

describe("averageBasket", () => {
  it("null si moins de 3 tickets", () => {
    expect(averageBasket([{ purchased_at: "x", total: 40 }, { purchased_at: "y", total: 60 }])).toBeNull();
  });

  it("moyenne des tickets > 0", () => {
    const avg = averageBasket([
      { purchased_at: "a", total: 40 },
      { purchased_at: "b", total: 60 },
      { purchased_at: "c", total: 50 },
    ]);
    expect(avg).toBe(50);
  });

  it("ignore les tickets sans montant", () => {
    const avg = averageBasket([
      { purchased_at: "a", total: 40 },
      { purchased_at: "b", total: 60 },
      { purchased_at: "c", total: 50 },
      { purchased_at: "d", total: 0 },
    ]);
    expect(avg).toBe(50);
  });
});

describe("projectMonthEnd", () => {
  it("null trop tôt dans le mois", () => {
    expect(projectMonthEnd(30, 2, 31)).toBeNull();
  });

  it("null sans dépense", () => {
    expect(projectMonthEnd(0, 10, 31)).toBeNull();
  });

  it("projette au rythme actuel", () => {
    // 187 € au jour 18 sur 31 -> ~322 €.
    expect(projectMonthEnd(187, 18, 31)).toBe(322);
  });
});
