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
  // Modèle vision actuel de Groq (les modèles Llama 4 vision ont été
  // décommissionnés le 17/06/2026). Sert aussi de repli si la variable
  // d'environnement pointe vers un modèle retiré.
  const FALLBACK_MODEL = "qwen/qwen3.6-27b";
  const model = process.env.GROQ_VISION_MODEL ?? FALLBACK_MODEL;

  try {
    let result;
    try {
      result = await parseReceiptImages(groq, model, parsed.data.images);
    } catch (firstError) {
      // Auto-réparation : si le modèle configuré est indisponible (retiré,
      // introuvable), on réessaie une fois avec le modèle de repli à jour.
      const msg =
        (firstError as { error?: { message?: string } }).error?.message ??
        (firstError as { message?: string }).message ??
        "";
      const isModelIssue = /model|decommission|not found|does not exist/i.test(msg);
      if (isModelIssue && model !== FALLBACK_MODEL) {
        console.warn(`[scan-receipt] modèle « ${model} » indisponible, repli sur ${FALLBACK_MODEL}`);
        result = await parseReceiptImages(groq, FALLBACK_MODEL, parsed.data.images);
      } else {
        throw firstError;
      }
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[scan-receipt] erreur:", error);

    // Erreur renvoyée par l'API Groq (modèle indisponible/décommissionné, quota,
    // authentification…). On la distingue d'un vrai souci de photo : la remonter
    // clairement évite de faire croire à l'utilisateur que ses photos sont floues.
    const status = (error as { status?: number }).status;
    const apiMessage =
      (error as { error?: { message?: string } }).error?.message ??
      (error as { message?: string }).message;

    if (typeof status === "number") {
      if (status === 429) {
        return NextResponse.json(
          { error: "Limite du scanner atteinte pour le moment. Réessaie dans quelques minutes." },
          { status: 429 },
        );
      }
      // 400/404 sur le modèle = modèle vision invalide/retiré côté Groq.
      const isModelIssue = /model|decommission|not found|does not exist/i.test(apiMessage ?? "");
      return NextResponse.json(
        {
          error: isModelIssue
            ? `Le modèle de scan « ${model} » n'est plus disponible. Mets à jour GROQ_VISION_MODEL.`
            : `Le scanner a rencontré une erreur (${status})${apiMessage ? ` : ${apiMessage}` : ""}.`,
        },
        { status: 502 },
      );
    }

    // Pas d'erreur API => réponse illisible du modèle (JSON invalide, vide…) :
    // là, une photo plus nette peut effectivement aider.
    return NextResponse.json(
      { error: "Impossible de lire le ticket. Réessaie avec une photo plus nette et bien cadrée." },
      { status: 500 },
    );
  }
}
