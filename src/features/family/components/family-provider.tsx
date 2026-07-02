"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Family } from "@/types/db";

import type { FamilyRole } from "../lib/roles";

/**
 * Fournit la "famille active", le rôle de l'utilisateur et son identifiant à
 * toute l'arborescence protégée. Chargé côté serveur (layout) puis injecté ici,
 * ce qui évite de le recharger sur chaque page.
 */
type FamilyContextValue = {
  family: Family;
  role: FamilyRole;
  userId: string;
  email: string | null;
};

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({
  value,
  children,
}: {
  value: FamilyContextValue;
  children: ReactNode;
}) {
  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

function useFamilyContext(): FamilyContextValue {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("Les hooks famille doivent être utilisés dans un <FamilyProvider>");
  }
  return context;
}

export function useActiveFamily(): Family {
  return useFamilyContext().family;
}

export function useMyRole(): FamilyRole {
  return useFamilyContext().role;
}

/** Rôle + identité de l'utilisateur courant dans la famille active. */
export function useMyMembership(): FamilyContextValue {
  return useFamilyContext();
}
