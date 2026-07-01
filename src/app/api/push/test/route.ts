import { NextResponse } from "next/server";

import { isPushConfigured, sendPush } from "@/lib/push/send";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Notifications push non configurées." }, { status: 503 });
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", user.id);

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ error: "Aucun appareil abonné." }, { status: 400 });
  }

  const stale = await sendPush(subscriptions, {
    title: "Assistant Familial",
    body: "🔔 Notification de test réussie !",
    url: "/dashboard",
  });

  if (stale.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return NextResponse.json({ sent: subscriptions.length - stale.length });
}
