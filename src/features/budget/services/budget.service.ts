import { createClient } from "@/lib/supabase/client";

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

export type CategoryTotal = { category: string; amount: number };
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

  const totals = new Map<string, number>();
  let total = 0;
  for (const item of itemsResult.data) {
    const price = Number(item.price) || 0;
    total += price;
    const category = item.category ?? "other";
    totals.set(category, (totals.get(category) ?? 0) + price);
  }

  const byCategory = Array.from(totals, ([category, amount]) => ({ category, amount })).sort(
    (a, b) => b.amount - a.amount,
  );

  return { total, byCategory, receipts: receiptsResult.data };
}
