export type ExpiryStatus = "expired" | "soon" | "ok";

/**
 * Statut de péremption d'un produit :
 * - "expired" : date passée
 * - "soon"    : périme dans les `soonDays` prochains jours
 * - "ok"      : encore bon
 * - null      : pas de date renseignée
 */
export function getExpiryStatus(expiryDate: string | null, soonDays = 3): ExpiryStatus | null {
  if (!expiryDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${expiryDate}T00:00:00`);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return "expired";
  if (diffDays <= soonDays) return "soon";
  return "ok";
}

export function formatExpiry(expiryDate: string): string {
  return new Date(`${expiryDate}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
