import { NextResponse } from "next/server";
import { z } from "zod";

import { getErrorMessage } from "@/lib/get-error-message";
import { isPushConfigured, sendPush } from "@/lib/push/send";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(120),
  assigneeIds: z.array(z.string().uuid()).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  points: z.number().int().min(1).max(10).optional(),
  recurrence: z.enum(["daily", "weekly"]).nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { data: families } = await supabase
    .from("families")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  const familyId = families?.[0]?.id;
  if (!familyId) {
    return NextResponse.json({ error: "Aucune famille active." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const { title, assigneeIds = [], dueDate, points, recurrence } = parsed.data;

  const { error } = await supabase.from("chores").insert({
    family_id: familyId,
    assignee_ids: assigneeIds,
    title,
    due_date: dueDate ?? null,
    points: points ?? 1,
    recurrence: recurrence ?? null,
    created_by: user.id,
  });
  if (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }

  // Notifie chaque personne assignée (sauf soi-même).
  const targets = assigneeIds.filter((id) => id !== user.id);
  if (targets.length > 0 && isPushConfigured()) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint,p256dh,auth")
        .in("user_id", targets);
      if (subs && subs.length > 0) {
        const stale = await sendPush(subs, {
          title: "Nouvelle tâche",
          body: `${profile?.display_name ?? "Un parent"} t'a assigné : ${title}`,
          url: "/taches",
        });
        if (stale.length > 0) {
          await supabase.from("push_subscriptions").delete().in("endpoint", stale);
        }
      }
    } catch {
      // La notification est un bonus : on n'échoue pas la création si elle rate.
    }
  }

  return NextResponse.json({ ok: true });
}
