import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string(), auth: z.string() }),
  }),
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

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Abonnement invalide." }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data.subscription;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      family_id: familyId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: request.headers.get("user-agent"),
    },
    { onConflict: "endpoint", ignoreDuplicates: true },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
