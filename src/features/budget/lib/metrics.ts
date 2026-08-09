/**
 * Métriques budgétaires PURES et testables (dépenses hebdo, panier moyen,
 * projection fin de mois). Règle d'or de la vision : ne rien afficher sur
 * données insuffisantes -> ces fonctions retournent `null` quand il n'y a pas
 * assez de matière, plutôt qu'un chiffre trompeur.
 */

export type ReceiptRow = { purchased_at: string; total: number | null };
export type WeekBucket = { weekStartIso: string; total: number };

/**
 * Sérialise une date en « AAAA-MM-JJ » à partir de ses composants LOCAUX.
 * (Ne jamais utiliser toISOString ici : ça convertit en UTC et décale d'un
 * jour dans les fuseaux != UTC — bug classique.)
 */
export function toLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Lundi de la semaine d'une date (semaine ISO commençant lundi). */
export function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = dimanche … 6 = samedi
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Dépenses par semaine sur les `weeks` dernières semaines (la plus ancienne en
 * premier, la semaine courante en dernier). Les semaines sans ticket valent 0.
 */
export function weeklyBuckets(
  receipts: ReceiptRow[],
  weeks: number,
  today: Date = new Date(),
): WeekBucket[] {
  const currentMonday = mondayOf(today);
  const buckets: WeekBucket[] = [];
  const indexByKey = new Map<string, number>();

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() - i * 7);
    const iso = toLocalIso(d);
    indexByKey.set(iso, buckets.length);
    buckets.push({ weekStartIso: iso, total: 0 });
  }

  for (const receipt of receipts) {
    const monday = toLocalIso(mondayOf(new Date(`${receipt.purchased_at}T00:00:00`)));
    const index = indexByKey.get(monday);
    if (index != null) buckets[index]!.total += Number(receipt.total) || 0;
  }

  return buckets;
}

/**
 * Panier moyen = moyenne des tickets (montant > 0). `null` si moins de
 * `minReceipts` tickets (pas assez pour être fiable).
 */
export function averageBasket(receipts: ReceiptRow[], minReceipts = 3): number | null {
  const totals = receipts.map((r) => Number(r.total) || 0).filter((total) => total > 0);
  if (totals.length < minReceipts) return null;
  const sum = totals.reduce((acc, total) => acc + total, 0);
  return sum / totals.length;
}

/**
 * Projection de dépense en fin de mois au rythme actuel.
 * `null` si on est trop tôt dans le mois (< `minDay`) ou sans dépense : une
 * projection sur 1-2 jours n'a aucun sens (c'est une ESTIMATION, pas une
 * certitude).
 */
export function projectMonthEnd(
  spentSoFar: number,
  dayOfMonth: number,
  daysInMonth: number,
  minDay = 5,
): number | null {
  if (dayOfMonth < minDay || spentSoFar <= 0 || daysInMonth <= 0) return null;
  return Math.round((spentSoFar / dayOfMonth) * daysInMonth);
}
