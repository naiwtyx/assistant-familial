import { categoryLabel } from "@/config/constants";
import { averageBasket } from "@/features/budget/lib/metrics";
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

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export type HouseholdPattern = {
  /** Identifiant stable (pour « ignorer »). */
  key: string;
  category: "shopping" | "meal" | "budget";
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

  const [receiptsResult, cookedResult, itemsResult] = await Promise.all([
    supabase.from("receipts").select("purchased_at,total").eq("family_id", familyId),
    supabase
      .from("activity_log")
      .select("payload")
      .eq("family_id", familyId)
      .eq("type", "meal_cooked")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("receipt_items").select("category,price").eq("family_id", familyId),
  ]);

  const receipts = receiptsResult.data ?? [];

  // Jour de courses (quand la famille achète réellement).
  const dates = receipts
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

  // Panier moyen (§ 13). Confiance croissante avec le nombre de tickets.
  const avg = averageBasket(receipts, 4);
  if (avg != null) {
    patterns.push({
      key: "average_basket",
      category: "budget",
      text: `Votre panier moyen est d'environ ${euro.format(avg)}.`,
      confidence: Math.min(1, receipts.length / 10),
      observations: receipts.length,
    });
  }

  // Poste de dépense le plus coûteux (catégorie dominante des tickets).
  const items = itemsResult.data ?? [];
  const byCategory = new Map<string, number>();
  let totalSpend = 0;
  for (const item of items) {
    const price = Number(item.price) || 0;
    if (price <= 0) continue;
    const cat = item.category ?? "other";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + price);
    totalSpend += price;
  }
  if (items.length >= 8 && totalSpend > 0) {
    let topCat = "";
    let topAmount = 0;
    for (const [cat, amount] of byCategory) {
      if (amount > topAmount) {
        topCat = cat;
        topAmount = amount;
      }
    }
    const share = topAmount / totalSpend;
    if (topCat && share >= 0.25) {
      patterns.push({
        key: "top_category",
        category: "budget",
        text: `Votre poste le plus coûteux : ${categoryLabel(topCat)} (~${Math.round(share * 100)} % des dépenses).`,
        confidence: share,
        observations: items.length,
      });
    }
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
