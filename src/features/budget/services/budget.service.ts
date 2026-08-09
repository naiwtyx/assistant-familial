import { createClient } from "@/lib/supabase/client";

import { aggregateReceiptItems, type CategoryTotal } from "../lib/aggregate";
import { compareMonthlySpending, type MonthlyComparison } from "../lib/budget-insights";
import { buildPriceMap } from "../lib/estimate";
import { averageBasket, weeklyBuckets, type WeekBucket } from "../lib/metrics";

export type ReceiptItemInput = {
  name: string;
  quantity: number;
  category: string | null;
  price: number;
};

export type SaveReceiptInput = {
  familyId: string;
  store: string | null;
  date: string | null;
  total: number | null;
  items: ReceiptItemInput[];
};

/** Définit le plafond de budget mensuel (réservé aux parents). `null` = aucun. */
export async function setFamilyBudget(familyId: string, budget: number | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_family_budget", {
    p_family_id: familyId,
    p_budget: budget,
  });
  if (error) throw error;
}

/** Enregistre un ticket + ses lignes via la RPC sécurisée (atomique). */
export async function saveReceipt(input: SaveReceiptInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("save_receipt", {
    p_family_id: input.familyId,
    p_store: input.store,
    p_purchased_at: input.date,
    p_total: input.total,
    p_items: input.items,
  });
  if (error) throw error;
}

export type MonthlyBudget = {
  total: number;
  byCategory: CategoryTotal[];
  receipts: { id: string; store: string | null; purchased_at: string; total: number | null }[];
};

/** Agrège les dépenses d'un mois donné (réservé aux parents via RLS). */
export async function getMonthlyBudget(
  familyId: string,
  year: number,
  month: number,
): Promise<MonthlyBudget> {
  const supabase = createClient();
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = new Date(year, month + 1, 1);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;

  const [itemsResult, receiptsResult] = await Promise.all([
    supabase
      .from("receipt_items")
      .select("category,price")
      .eq("family_id", familyId)
      .gte("purchased_at", start)
      .lt("purchased_at", end),
    supabase
      .from("receipts")
      .select("id,store,purchased_at,total")
      .eq("family_id", familyId)
      .gte("purchased_at", start)
      .lt("purchased_at", end)
      .order("purchased_at", { ascending: false })
      .limit(10),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (receiptsResult.error) throw receiptsResult.error;

  const { total, byCategory } = aggregateReceiptItems(itemsResult.data);

  return { total, byCategory, receipts: receiptsResult.data };
}

/** Agrège juste total + répartition par catégorie, sans le détail des tickets. */
async function getMonthlyTotals(
  familyId: string,
  year: number,
  month: number,
): Promise<{ total: number; byCategory: CategoryTotal[] }> {
  const supabase = createClient();
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = new Date(year, month + 1, 1);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("receipt_items")
    .select("category,price")
    .eq("family_id", familyId)
    .gte("purchased_at", start)
    .lt("purchased_at", end);
  if (error) throw error;

  return aggregateReceiptItems(data);
}

export type BudgetMetrics = {
  weeks: WeekBucket[]; // 6 dernières semaines (courante en dernier)
  thisWeek: number;
  lastWeek: number;
  weeklyAverage: number | null; // moyenne des semaines actives, null si < 3
  averageBasket: number | null; // panier moyen, null si < 3 tickets
  receiptCount: number; // total de tickets sur la fenêtre (garde-fou données)
};

/**
 * Métriques de tendance récentes (indépendantes du mois navigué) : dépenses
 * hebdomadaires, panier moyen. Réservé aux parents (RLS). Chaque métrique est
 * `null` si les données sont insuffisantes — on n'affiche pas de faux chiffre.
 */
export async function getBudgetMetrics(familyId: string): Promise<BudgetMetrics> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - 84); // ~12 semaines
  const sinceIso = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("receipts")
    .select("purchased_at,total")
    .eq("family_id", familyId)
    .gte("purchased_at", sinceIso)
    .order("purchased_at");
  if (error) throw error;

  const receipts = data ?? [];
  const weeks = weeklyBuckets(receipts, 6);
  const thisWeek = weeks[weeks.length - 1]?.total ?? 0;
  const lastWeek = weeks[weeks.length - 2]?.total ?? 0;

  // Moyenne hebdo = moyenne des semaines COMPLÉTÉES (hors semaine courante)
  // qui ont eu au moins une dépense. Fiable seulement à partir de 3 semaines.
  const completed = weeks.slice(0, -1).filter((week) => week.total > 0);
  const weeklyAverage =
    completed.length >= 3
      ? completed.reduce((sum, week) => sum + week.total, 0) / completed.length
      : null;

  return {
    weeks,
    thisWeek,
    lastWeek,
    weeklyAverage,
    averageBasket: averageBasket(receipts),
    receiptCount: receipts.length,
  };
}

export type ShoppingEstimateContext = {
  /** nom normalisé -> prix typique observé sur les tickets. */
  priceByName: Record<string, number>;
  /** dépense déjà engagée ce mois-ci (lignes de tickets). */
  spentThisMonth: number;
  /** nb de produits distincts avec un prix connu (garde-fou d'affichage). */
  priceSampleSize: number;
  /** panier moyen (habitude), null si pas assez de tickets. */
  averageBasket: number | null;
};

/**
 * Contexte pour estimer le coût d'une liste de courses : table de prix (6
 * derniers mois) + dépense du mois. Réservé aux parents (RLS) : les autres
 * membres reçoivent un contexte vide -> l'estimation ne s'affiche pas.
 */
export async function getShoppingEstimateContext(familyId: string): Promise<ShoppingEstimateContext> {
  const supabase = createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  const sinceIso = since.toISOString().slice(0, 10);
  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;

  const [historyResult, monthResult, receiptsResult] = await Promise.all([
    supabase
      .from("receipt_items")
      .select("name,price")
      .eq("family_id", familyId)
      .gte("purchased_at", sinceIso),
    supabase.from("receipt_items").select("price").eq("family_id", familyId).gte("purchased_at", monthStart),
    supabase.from("receipts").select("total").eq("family_id", familyId).gte("purchased_at", sinceIso),
  ]);
  if (historyResult.error) throw historyResult.error;

  const priceByName = buildPriceMap(historyResult.data ?? []);
  const spentThisMonth = (monthResult.data ?? []).reduce((sum, row) => sum + (Number(row.price) || 0), 0);
  const basket = averageBasket(
    (receiptsResult.data ?? []).map((row) => ({ purchased_at: "", total: row.total })),
  );

  return {
    priceByName,
    spentThisMonth,
    priceSampleSize: Object.keys(priceByName).length,
    averageBasket: basket,
  };
}

/** Compare les dépenses du mois donné (`month` 0-indexé) à celles du mois précédent. */
export async function getMonthlyComparison(
  familyId: string,
  year: number,
  month: number,
): Promise<MonthlyComparison> {
  const previousDate = new Date(year, month - 1, 1);
  const [current, previous] = await Promise.all([
    getMonthlyTotals(familyId, year, month),
    getMonthlyTotals(familyId, previousDate.getFullYear(), previousDate.getMonth()),
  ]);
  return compareMonthlySpending(current, previous);
}
