import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseReceiptImages } from "@/lib/scanner/parse-receipt";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  // 1 à 5 images du ticket (data URL base64, déjà redimensionnées côté client).
  images: z
    .array(z.string().startsWith("data:image/").max(6_000_000, "Image trop volumineuse."))
    .min(1)
    .max(5),
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
    const result = await parseReceiptImages(groq, model, parsed.data.images);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[scan-receipt] erreur:", error);
    return NextResponse.json(
      { error: "Impossible de lire le ticket. Réessaie avec une photo plus nette." },
      { status: 500 },
    );
  }
}
