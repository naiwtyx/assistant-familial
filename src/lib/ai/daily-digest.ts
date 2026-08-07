import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

import { aggregateReceiptItems } from "@/features/budget/lib/aggregate";
import { computeBudgetStatus } from "@/features/budget/lib/budget-status";
import { getExpiryStatus } from "@/features/inventory/lib/expiry";
import type { Database } from "@/types/database.types";

import { deterministicDigestMessage, type DigestFacts } from "./digest-message";

export type { DigestFacts } from "./digest-message";
export { hasNotableFacts } from "./digest-message";

type AdminDb = SupabaseClient<Database>;

/** Rassemble les faits du jour d'une famille pour le digest proactif. */
export async function buildDigestFacts(admin: AdminDb, familyId: string): Promise<DigestFacts> {
  const today = new Date().toISOString().slice(0, 10);

  const [choresResult, eventsResult, familyResult, inventoryResult] = await Promise.all([
    admin
      .from("chores")
      .select("title,due_date")
      .eq("family_id", familyId)
      .eq("done", false)
      .not("due_date", "is", null)
      .lte("due_date", today),
    admin.from("events").select("title,event_time").eq("family_id", familyId).eq("event_date", today),
    admin.from("families").select("monthly_budget").eq("id", familyId).single(),
    admin
      .from("inventory_items")
      .select("name,expiry_date")
      .eq("family_id", familyId)
      .not("expiry_date", "is", null),
  ]);

  const choresOverdue: string[] = [];
  const choresDueToday: string[] = [];
  for (const chore of choresResult.data ?? []) {
    if (chore.due_date === today) choresDueToday.push(chore.title);
    else choresOverdue.push(chore.title);
  }

  const eventsToday = (eventsResult.data ?? []).map((event) => ({
    title: event.title,
    time: event.event_time,
  }));

  const limit = familyResult.data?.monthly_budget ?? null;
  let budget: DigestFacts["budget"] = null;
  if (limit != null && limit > 0) {
    const monthStart = `${today.slice(0, 7)}-01`;
    const { data: items } = await admin
      .from("receipt_items")
      .select("category,price")
      .eq("family_id", familyId)
      .gte("purchased_at", monthStart)
      .lte("purchased_at", today);
    const { total } = aggregateReceiptItems(items ?? []);
    const status = computeBudgetStatus(total, limit);
    if (status.overBudget || status.nearBudget) {
      budget = { total, limit, overBudget: status.overBudget, nearBudget: status.nearBudget };
    }
  }

  const expiringSoon: string[] = [];
  const expired: string[] = [];
  for (const item of inventoryResult.data ?? []) {
    const status = getExpiryStatus(item.expiry_date);
    if (status === "soon") expiringSoon.push(item.name);
    else if (status === "expired") expired.push(item.name);
  }

  return { choresOverdue, choresDueToday, eventsToday, budget, expiringSoon, expired };
}

/**
 * Compose un résumé court en français à partir des faits du jour. Tente une
 * formulation naturelle via l'IA (Groq) ; repli déterministe si la clé API
 * est absente ou si l'appel échoue — la fiabilité d'un cron non surveillé
 * prime sur le style.
 */
export async function composeDigestMessage(
  apiKey: string | undefined,
  facts: DigestFacts,
): Promise<string> {
  const fallback = deterministicDigestMessage(facts);
  if (!apiKey) return fallback;

  try {
    const groq = new Groq({ apiKey });
    const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "Tu rédiges une notification push courte (2 phrases max, 220 caractères max) pour une famille, en français, ton chaleureux et concret. Pas de markdown, pas de liste à puces, pas de guillemets autour du texte.",
        },
        { role: "user", content: `Faits du jour à résumer : ${fallback}` },
      ],
      max_tokens: 150,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : fallback;
  } catch {
    return fallback;
  }
}
