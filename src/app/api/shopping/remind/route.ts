import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/get-error-message";
import { isPushConfigured, sendPush } from "@/lib/push/send";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Un parent envoie un rappel « complétez la liste de courses » aux autres membres. */
export async function POST() {
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

  // Seuls les parents/propriétaires peuvent envoyer le rappel.
  const { data: me } = await supabase
    .from("family_members")
    .select("role")
    .eq("family_id", familyId)
    .eq("user_id", user.id)
    .single();
  if (!me || me.role === "member") {
    return NextResponse.json({ error: "Action réservée aux parents." }, { status: 403 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Les notifications ne sont pas configurées." }, { status: 503 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  // Tous les membres de la famille sauf l'émetteur.
  const { data: members } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId)
    .neq("user_id", user.id);
  const targetIds = (members ?? []).map((m) => m.user_id);
  if (targetIds.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .in("user_id", targetIds);
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  try {
    const stale = await sendPush(subs, {
      title: "Liste de courses",
      body: `${profile?.display_name ?? "Un parent"} te rappelle de compléter la liste de courses.`,
      url: "/courses",
    });
    if (stale.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", stale);
    }
    return NextResponse.json({ sent: subs.length - stale.length });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
