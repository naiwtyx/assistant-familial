import { normalizeName } from "@/lib/normalize";

/**
 * Détecteurs de patterns PURS et testables. Principe directeur (vision § 6-7) :
 * ne JAMAIS considérer un pattern comme vrai après une seule observation.
 * Chaque détecteur exige un nombre minimum d'observations ET une concentration
 * suffisante (confiance), sinon il retourne `null` — mieux vaut ne rien dire
 * que d'inventer.
 */

export type Detection = {
  /** Valeur détectée (jour de semaine 0-6 en chaîne, nom d'élément…). */
  value: string;
  /** Nombre total d'observations analysées. */
  observations: number;
  /** Concentration 0-1 : part des observations qui vont vers la valeur dominante. */
  confidence: number;
};

/**
 * Jour de semaine dominant à partir d'une liste de dates ISO (AAAA-MM-JJ).
 * Retourne `null` tant qu'on n'a pas assez de données ou pas de tendance nette.
 */
export function detectDominantDay(
  isoDates: string[],
  minObservations = 4,
  minConfidence = 0.4,
): Detection | null {
  const days = isoDates
    .map((iso) => new Date(`${iso}T00:00:00`).getDay())
    .filter((day) => !Number.isNaN(day));
  if (days.length < minObservations) return null;

  const counts = new Map<number, number>();
  for (const day of days) counts.set(day, (counts.get(day) ?? 0) + 1);

  let bestDay = -1;
  let bestCount = 0;
  for (const [day, count] of counts) {
    if (count > bestCount) {
      bestDay = day;
      bestCount = count;
    }
  }

  const confidence = bestCount / days.length;
  if (confidence < minConfidence) return null;
  return { value: String(bestDay), observations: days.length, confidence };
}

/**
 * Élément le plus fréquent d'une liste (rapproché par nom normalisé).
 * Ex. le repas le plus souvent cuisiné. `null` si pas assez de données ou
 * pas de dominante claire.
 */
export function detectMostFrequent(
  items: string[],
  minObservations = 4,
  minConfidence = 0.3,
): Detection | null {
  const cleaned = items.map((item) => item.trim()).filter((item) => item.length > 0);
  if (cleaned.length < minObservations) return null;

  const counts = new Map<string, { display: string; count: number }>();
  for (const item of cleaned) {
    const key = normalizeName(item);
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { display: item, count: 1 });
  }

  let best: { display: string; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  if (!best || best.count < 2) return null; // au moins 2 fois pour parler de « fréquent »

  const confidence = best.count / cleaned.length;
  if (confidence < minConfidence) return null;
  return { value: best.display, observations: cleaned.length, confidence };
}

/** Étiquette de confiance lisible pour l'utilisateur (transparence § 9). */
export function confidenceLabel(confidence: number): "faible" | "moyenne" | "élevée" {
  if (confidence >= 0.7) return "élevée";
  if (confidence >= 0.5) return "moyenne";
  return "faible";
}
