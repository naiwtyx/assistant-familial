import { describe, expect, it } from "vitest";

import { getAuthErrorMessage } from "./auth-errors";

describe("getAuthErrorMessage", () => {
  it("traduit les identifiants invalides", () => {
    expect(getAuthErrorMessage({ message: "Invalid login credentials" })).toBe(
      "Email ou mot de passe incorrect.",
    );
  });

  it("traduit un compte déjà existant", () => {
    expect(getAuthErrorMessage({ message: "User already registered" })).toBe(
      "Un compte existe déjà avec cet email.",
    );
  });

  it("traduit un email non confirmé", () => {
    expect(getAuthErrorMessage({ message: "Email not confirmed" })).toBe(
      "Ton email n'est pas encore confirmé. Vérifie ta boîte mail.",
    );
  });

  it("traduit un mot de passe trop court", () => {
    expect(
      getAuthErrorMessage({ message: "Password should be at least 6 characters" }),
    ).toBe("Mot de passe trop court (6 caractères minimum).");
  });

  it("traduit une limite de débit atteinte", () => {
    expect(getAuthErrorMessage({ message: "over_email_send_rate_limit" })).toBe(
      "Trop de tentatives. Patiente quelques instants.",
    );
  });

  it("retombe sur le message brut pour une erreur non reconnue", () => {
    expect(getAuthErrorMessage({ message: "Something exploded" })).toBe("Something exploded");
  });

  it("retombe sur un message générique si l'erreur n'a pas de message", () => {
    expect(getAuthErrorMessage("boom")).toBe("Une erreur est survenue. Réessaie.");
    expect(getAuthErrorMessage(null)).toBe("Une erreur est survenue. Réessaie.");
    expect(getAuthErrorMessage(undefined)).toBe("Une erreur est survenue. Réessaie.");
  });
});
