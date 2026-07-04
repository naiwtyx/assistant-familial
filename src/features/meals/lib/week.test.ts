import { describe, expect, it } from "vitest";

import { addDays, startOfWeek, toISODate } from "./week";

describe("week helpers", () => {
  it("toISODate formate en date locale", () => {
    expect(toISODate(new Date(2026, 6, 4))).toBe("2026-07-04");
  });

  it("addDays ajoute le bon nombre de jours", () => {
    expect(toISODate(addDays(new Date(2026, 6, 4), 3))).toBe("2026-07-07");
  });

  it("startOfWeek renvoie le lundi de la semaine (<= date)", () => {
    const date = new Date(2026, 6, 4);
    const start = startOfWeek(date);
    expect(start.getDay()).toBe(1); // lundi
    expect(start.getTime()).toBeLessThanOrEqual(date.getTime());
  });
});
