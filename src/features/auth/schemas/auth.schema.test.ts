import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "./auth.schema";

describe("loginSchema", () => {
  it("accepte un email et mot de passe valides", () => {
    expect(
      loginSchema.safeParse({ email: "test@example.com", password: "secret123" }).success,
    ).toBe(true);
  });

  it("rejette un email invalide", () => {
    const result = loginSchema.safeParse({ email: "pas-un-email", password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("rejette un mot de passe trop court", () => {
    const result = loginSchema.safeParse({ email: "test@example.com", password: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = { displayName: "Alice", email: "alice@example.com", password: "secret123" };

  it("accepte des données valides", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejette un prénom vide", () => {
    expect(registerSchema.safeParse({ ...base, displayName: "" }).success).toBe(false);
  });

  it("rejette un prénom trop long", () => {
    expect(registerSchema.safeParse({ ...base, displayName: "a".repeat(51) }).success).toBe(
      false,
    );
  });

  it("rejette un email invalide", () => {
    expect(registerSchema.safeParse({ ...base, email: "invalide" }).success).toBe(false);
  });

  it("rejette un mot de passe trop court", () => {
    expect(registerSchema.safeParse({ ...base, password: "123" }).success).toBe(false);
  });
});
