import { describe, expect, it } from "vitest";

import { deterministicDigestMessage, hasNotableFacts, type DigestFacts } from "./digest-message";

const EMPTY_FACTS: DigestFacts = {
  choresOverdue: [],
  choresDueToday: [],
  eventsToday: [],
  budget: null,
  expiringSoon: [],
  expired: [],
};

describe("hasNotableFacts", () => {
  it("vaut false quand tout est vide", () => {
    expect(hasNotableFacts(EMPTY_FACTS)).toBe(false);
  });

  it("vaut true dès qu'une corvée est en retard", () => {
    expect(hasNotableFacts({ ...EMPTY_FACTS, choresOverdue: ["Vaisselle"] })).toBe(true);
  });

  it("vaut true dès qu'un événement est prévu aujourd'hui", () => {
    expect(
      hasNotableFacts({ ...EMPTY_FACTS, eventsToday: [{ title: "Dentiste", time: "14:00" }] }),
    ).toBe(true);
  });

  it("vaut true dès qu'un budget est signalé (proche ou dépassé)", () => {
    expect(
      hasNotableFacts({
        ...EMPTY_FACTS,
        budget: { total: 90, limit: 100, overBudget: false, nearBudget: true },
      }),
    ).toBe(true);
  });

  it("vaut true dès qu'un produit périme bientôt ou est périmé", () => {
    expect(hasNotableFacts({ ...EMPTY_FACTS, expiringSoon: ["Lait"] })).toBe(true);
    expect(hasNotableFacts({ ...EMPTY_FACTS, expired: ["Yaourt"] })).toBe(true);
  });
});

describe("deterministicDigestMessage", () => {
  it("retombe sur un message neutre sans rien à signaler", () => {
    expect(deterministicDigestMessage(EMPTY_FACTS)).toBe("Rien à signaler aujourd'hui.");
  });

  it("mentionne les corvées en retard", () => {
    const message = deterministicDigestMessage({ ...EMPTY_FACTS, choresOverdue: ["Vaisselle", "Poubelles"] });
    expect(message).toContain("2 corvée(s) en retard");
    expect(message).toContain("Vaisselle");
    expect(message).toContain("Poubelles");
  });

  it("mentionne les événements du jour avec l'heure si connue", () => {
    const message = deterministicDigestMessage({
      ...EMPTY_FACTS,
      eventsToday: [{ title: "Dentiste", time: "14:30" }, { title: "Piscine", time: null }],
    });
    expect(message).toContain("Dentiste à 14:30");
    expect(message).toContain("Piscine");
  });

  it("mentionne un dépassement de budget distinctement d'une simple approche", () => {
    const over = deterministicDigestMessage({
      ...EMPTY_FACTS,
      budget: { total: 120, limit: 100, overBudget: true, nearBudget: false },
    });
    expect(over).toContain("dépassé");

    const near = deterministicDigestMessage({
      ...EMPTY_FACTS,
      budget: { total: 85, limit: 100, overBudget: false, nearBudget: true },
    });
    expect(near).toContain("presque atteint");
  });

  it("combine plusieurs signaux avec un séparateur", () => {
    const message = deterministicDigestMessage({
      ...EMPTY_FACTS,
      choresDueToday: ["Ranger"],
      expired: ["Yaourt"],
    });
    expect(message).toBe("1 corvée(s) à faire aujourd'hui · 1 produit(s) périmé(s) : Yaourt");
  });
});
