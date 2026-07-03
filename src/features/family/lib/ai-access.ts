import type { FamilyRole } from "./roles";

/** Âge (en années) à partir d'une date de naissance ISO, ou null si inconnue/invalide. */
export function computeAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

type AiAccessInput = {
  role: FamilyRole;
  canUseAi: boolean;
  birthDate: string | null;
  minAge: number | null;
};

/**
 * Détermine si un membre peut parler à l'assistant IA.
 * - Les parents/propriétaires y ont toujours accès.
 * - Un membre doit avoir le droit `can_use_ai` activé.
 * - Si un âge minimum est défini, l'âge doit être renseigné et suffisant
 *   (âge inconnu + restriction active = bloqué, par précaution).
 */
export function canMemberUseAi({ role, canUseAi, birthDate, minAge }: AiAccessInput): boolean {
  if (role !== "member") return true;
  if (!canUseAi) return false;
  if (minAge == null) return true;
  const age = computeAge(birthDate);
  if (age == null) return false;
  return age >= minAge;
}
