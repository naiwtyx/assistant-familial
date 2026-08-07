import { NextResponse } from "next/server";
import { z } from "zod";

import { getErrorMessage } from "@/lib/get-error-message";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({ endpoint: z.string() });

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[push/unsubscribe] erreur:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
