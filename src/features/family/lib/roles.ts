/**
 * Hiérarchie des rôles au sein d'une famille :
 * - owner  : le créateur (droits complets, ne peut pas être rétrogradé)
 * - parent : membre autorisé (accède à l'espace parents, gère les rôles)
 * - member : membre standard (enfant / autre)
 */
export type FamilyRole = "owner" | "parent" | "member";

export const ROLE_LABELS: Record<FamilyRole, string> = {
  owner: "Propriétaire",
  parent: "Parent",
  member: "Membre",
};

/** Un utilisateur "autorisé" (parent ou propriétaire) accède à l'espace parents. */
export function isAuthorized(role: FamilyRole): boolean {
  return role === "owner" || role === "parent";
}
