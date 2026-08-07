import { NextResponse } from "next/server";

import { buildDigestFacts, composeDigestMessage, hasNotableFacts } from "@/lib/ai/daily-digest";
import { getErrorMessage } from "@/lib/get-error-message";
import { isPushConfigured, sendPush } from "@/lib/push/send";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Résumé quotidien proactif par famille : corvées en retard/du jour, agenda du
 * jour, budget proche/dépassé du plafond, produits qui périment. Rédigé par
 * l'IA (repli déterministe si Groq est indisponible), envoyé en push.
 * N'envoie rien si la journée n'a rien de notable à signaler.
 * Appelé quotidiennement par le cron Vercel. Protégé par `CRON_SECRET`.
 */
export async function GET(request: Request) {
  try {
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

    const { data: families, error } = await admin.from("families").select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    let notified = 0;
    let skipped = 0;

    for (const family of families ?? []) {
      const facts = await buildDigestFacts(admin, family.id);
      if (!hasNotableFacts(facts)) {
        skipped += 1;
        continue;
      }

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

      const message = await composeDigestMessage(apiKey, facts);
      const stale = await sendPush(subs, {
        title: "Résumé du jour",
        body: message,
        url: "/dashboard",
      });
      if (stale.length > 0) {
        await admin.from("push_subscriptions").delete().in("endpoint", stale);
      }
      notified += subs.length - stale.length;
    }

    return NextResponse.json({ families: families?.length ?? 0, notified, skipped });
  } catch (error) {
    console.error("[cron/daily-digest] erreur:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
