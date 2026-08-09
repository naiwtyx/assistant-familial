import { createClient } from "@/lib/supabase/client";

import { detectDominantDay, detectMostFrequent } from "../lib/detect";

const DAY_NAMES = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

export type HouseholdPattern = {
  /** Identifiant stable (pour « ignorer »). */
  key: string;
  category: "shopping" | "meal";
  text: string;
  confidence: number;
  observations: number;
};

/**
 * Construit le « profil comportemental » du foyer à partir de l'historique
 * RÉEL (tickets scannés, repas cuisinés). Chaque pattern passe par un
 * détecteur avec seuils de confiance : s'il n'y a pas assez de données ou pas
 * de tendance nette, il n'apparaît tout simplement pas (on n'invente rien).
 */
export async function getHouseholdPatterns(familyId: string): Promise<HouseholdPattern[]> {
  const supabase = createClient();
  const patterns: HouseholdPattern[] = [];

  const [receiptsResult, cookedResult] = await Promise.all([
    supabase.from("receipts").select("purchased_at").eq("family_id", familyId),
    supabase
      .from("activity_log")
      .select("payload")
      .eq("family_id", familyId)
      .eq("type", "meal_cooked")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  // Jour de courses (quand la famille achète réellement).
  const dates = (receiptsResult.data ?? [])
    .map((row) => row.purchased_at)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const day = detectDominantDay(dates);
  if (day) {
    patterns.push({
      key: "shopping_day",
      category: "shopping",
      text: `Vous faites souvent les courses le ${DAY_NAMES[Number(day.value)] ?? "?"}.`,
      confidence: day.confidence,
      observations: day.observations,
    });
  }

  // Repas le plus souvent cuisiné (signal réel « j'ai cuisiné »).
  const cookedRecipes = (cookedResult.data ?? [])
    .map((row) => {
      const payload = row.payload as { recipe?: unknown } | null;
      return typeof payload?.recipe === "string" ? payload.recipe : "";
    })
    .filter((name) => name.length > 0);
  const favorite = detectMostFrequent(cookedRecipes);
  if (favorite) {
    patterns.push({
      key: "favorite_meal",
      category: "meal",
      text: `Votre repas le plus fréquent : ${favorite.value}.`,
      confidence: favorite.confidence,
      observations: favorite.observations,
    });
  }

  return patterns;
}
