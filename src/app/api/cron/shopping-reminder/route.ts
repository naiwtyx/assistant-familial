import { NextResponse } from "next/server";

import { isPushConfigured, sendPush } from "@/lib/push/send";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Rappel automatique « complétez la liste de courses ».
 * Appelé quotidiennement par le cron Vercel. Notifie les familles dont le
 * `shopping_reminder_day` correspond au jour courant (0 = dimanche … 6 = samedi).
 * Protégé par `CRON_SECRET` (en-tête Authorization: Bearer …).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Clé de service Supabase non configurée." },
      { status: 503 },
    );
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Notifications non configurées." }, { status: 503 });
  }

  const today = new Date().getDay(); // 0 = dimanche … 6 = samedi

  const { data: families, error } = await admin
    .from("families")
    .select("id")
    .eq("shopping_reminder_day", today);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let notified = 0;
  for (const family of families ?? []) {
    const { data: members } = await admin
      .from("family_members")
      .select("user_id")
      .eq("family_id", family.id);
    const userIds = (members ?? []).map((member) => member.user_id);
    if (userIds.length === 0) continue;

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .in("user_id", userIds);
    if (!subs || subs.length === 0) continue;

    const stale = await sendPush(subs, {
      title: "Liste de courses",
      body: "C'est bientôt le jour des courses : pensez à compléter la liste !",
      url: "/courses",
    });
    if (stale.length > 0) {
      await admin.from("push_subscriptions").delete().in("endpoint", stale);
    }
    notified += subs.length - stale.length;
  }

  // Rappels d'agenda : événements du jour (toutes familles confondues).
  const todayIso = new Date().toISOString().slice(0, 10);
  const { data: events } = await admin
    .from("events")
    .select("family_id,title,event_time")
    .eq("event_date", todayIso);

  let eventsNotified = 0;
  for (const event of events ?? []) {
    const { data: members } = await admin
      .from("family_members")
      .select("user_id")
      .eq("family_id", event.family_id);
    const userIds = (members ?? []).map((member) => member.user_id);
    if (userIds.length === 0) continue;

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .in("user_id", userIds);
    if (!subs || subs.length === 0) continue;

    const time = event.event_time ? ` à ${event.event_time.slice(0, 5)}` : "";
    const stale = await sendPush(subs, {
      title: "Aujourd'hui",
      body: `${event.title}${time}`,
      url: "/agenda",
    });
    if (stale.length > 0) {
      await admin.from("push_subscriptions").delete().in("endpoint", stale);
    }
    eventsNotified += subs.length - stale.length;
  }

  return NextResponse.json({
    families: families?.length ?? 0,
    notified,
    events: events?.length ?? 0,
    eventsNotified,
  });
}
