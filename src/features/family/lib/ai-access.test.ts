import { describe, expect, it } from "vitest";

import { canMemberUseAi, computeAge } from "./ai-access";

describe("computeAge", () => {
  it("retourne null sans date", () => {
    expect(computeAge(null)).toBeNull();
    expect(computeAge("pas-une-date")).toBeNull();
  });

  it("calcule un âge cohérent", () => {
    const year = new Date().getFullYear() - 10;
    expect(computeAge(`${year}-01-01`)).toBeGreaterThanOrEqual(9);
  });
});

describe("canMemberUseAi", () => {
  it("autorise toujours les parents/propriétaires", () => {
    expect(canMemberUseAi({ role: "parent", canUseAi: false, birthDate: null, minAge: 18 })).toBe(
      true,
    );
  });

  it("bloque un membre dont le droit a été retiré", () => {
    expect(
      canMemberUseAi({ role: "member", canUseAi: false, birthDate: null, minAge: null }),
    ).toBe(false);
  });

  it("bloque un membre sans date de naissance si une limite existe", () => {
    expect(canMemberUseAi({ role: "member", canUseAi: true, birthDate: null, minAge: 13 })).toBe(
      false,
    );
  });

  it("autorise un membre assez âgé", () => {
    const year = new Date().getFullYear() - 20;
    expect(
      canMemberUseAi({ role: "member", canUseAi: true, birthDate: `${year}-01-01`, minAge: 13 }),
    ).toBe(true);
  });
});
