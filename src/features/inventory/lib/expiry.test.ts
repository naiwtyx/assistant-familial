import { describe, expect, it } from "vitest";

import { getExpiryStatus } from "./expiry";

describe("getExpiryStatus", () => {
  it("retourne null sans date", () => {
    expect(getExpiryStatus(null)).toBeNull();
  });

  it("détecte un produit périmé", () => {
    expect(getExpiryStatus("2000-01-01")).toBe("expired");
  });

  it("détecte un produit encore bon", () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    expect(getExpiryStatus(date.toISOString().slice(0, 10))).toBe("ok");
  });

  it("détecte un produit bientôt périmé", () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    expect(getExpiryStatus(date.toISOString().slice(0, 10))).toBe("soon");
  });
});
