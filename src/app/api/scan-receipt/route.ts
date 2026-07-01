import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseReceiptImage } from "@/lib/scanner/parse-receipt";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  // Image du ticket, en data URL base64 (déjà redimensionnée côté client).
  imageBase64: z
    .string()
    .startsWith("data:image/")
    .max(8_000_000, "Image trop volumineuse."),
});

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Le scanner n'est pas encore configuré (clé API Groq manquante)." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
      { status: 400 },
    );
  }

  const groq = new Groq({ apiKey });
  const model = process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

  try {
    const result = await parseReceiptImage(groq, model, parsed.data.imageBase64);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[scan-receipt] erreur:", error);
    return NextResponse.json(
      { error: "Impossible de lire le ticket. Réessaie avec une photo plus nette." },
      { status: 500 },
    );
  }
}
