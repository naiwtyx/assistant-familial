import { NextResponse } from "next/server";

import { generateInviteCode } from "@/features/family/lib/invite-code";
import { getErrorMessage } from "@/lib/get-error-message";
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

  const { data: families } = await supabase
    .from("families")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  const familyId = families?.[0]?.id;
  if (!familyId) {
    return NextResponse.json({ error: "Aucune famille active." }, { status: 400 });
  }

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error } = await supabase.rpc("create_invite", {
    p_family_id: familyId,
    p_code: code,
    p_expires_at: expiresAt,
  });
  if (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }

  // Invitation créée par un membre -> en attente : on prévient les parents.
  if (!invite.approved && isPushConfigured()) {
    try {
      const [{ data: me }, { data: parents }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        supabase
          .from("family_members")
          .select("user_id")
          .eq("family_id", familyId)
          .in("role", ["owner", "parent"]),
      ]);
      const parentIds = (parents ?? []).map((p) => p.user_id);
      if (parentIds.length > 0) {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("endpoint,p256dh,auth")
          .in("user_id", parentIds);
        if (subs && subs.length > 0) {
          const stale = await sendPush(subs, {
            title: "Assistant Familial",
            body: `${me?.display_name ?? "Un membre"} demande à inviter quelqu'un. À approuver dans l'Espace parents.`,
            url: "/parents",
          });
          if (stale.length > 0) {
            await supabase.from("push_subscriptions").delete().in("endpoint", stale);
          }
        }
      }
    } catch {
      // La notification est un bonus : on n'échoue pas la création si elle rate.
    }
  }

  return NextResponse.json({ code: invite.code, approved: invite.approved });
}
