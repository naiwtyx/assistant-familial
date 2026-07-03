import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import { buildExecutors, tools } from "@/lib/ai/build-tools";
import { getErrorMessage } from "@/lib/get-error-message";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1)
    .max(50),
});

const SYSTEM_PROMPT = `Tu es l'assistant de l'application « Assistant Familial ».
Tu aides une famille à gérer sa liste de courses, son inventaire et ses recettes.
Utilise les fonctions fournies pour LIRE et MODIFIER ces données. Quand la demande est claire
(ajouter, supprimer, mettre à jour un article, créer une recette), agis directement puis
confirme brièvement ce que tu as fait. Sois concis, amical, et réponds toujours en français.
N'invente jamais de données : appelle les fonctions de lecture pour connaître l'état réel.`;

const MAX_TOOL_ROUNDS = 6;

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "L'assistant IA n'est pas encore configuré (clé API Groq manquante)." },
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

  const { data: families } = await supabase
    .from("families")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  const familyId = families?.[0]?.id;
  if (!familyId) {
    return NextResponse.json({ error: "Aucune famille active." }, { status: 400 });
  }

  // Un membre dont le droit IA a été retiré par un parent ne peut pas utiliser l'assistant.
  const { data: membership } = await supabase
    .from("family_members")
    .select("role,can_use_ai")
    .eq("family_id", familyId)
    .eq("user_id", user.id)
    .single();
  if (membership && membership.role === "member" && !membership.can_use_ai) {
    return NextResponse.json(
      { error: "L'accès à l'assistant a été désactivé par un parent." },
      { status: 403 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const groq = new Groq({ apiKey });
  const executors = buildExecutors(supabase, familyId, user.id);
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...parsed.data.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  try {
    let completion = await groq.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: "auto",
    });
    let message = completion.choices[0]?.message;

    let round = 0;
    while (message?.tool_calls && message.tool_calls.length > 0 && round < MAX_TOOL_ROUNDS) {
      round += 1;

      // Rejoue le tour "appel d'outil" de l'assistant...
      messages.push(message);

      // ...puis exécute chaque outil et renvoie les résultats.
      for (const call of message.tool_calls) {
        const executor = executors[call.function.name];
        let result: string;
        try {
          const args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
          result = executor
            ? await executor(args)
            : `Outil inconnu : ${call.function.name}`;
        } catch (error) {
          result = `Erreur lors de l'exécution : ${getErrorMessage(error)}`;
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }

      completion = await groq.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: "auto",
      });
      message = completion.choices[0]?.message;
    }

    return NextResponse.json({ text: message?.content ?? "" });
  } catch (error) {
    console.error("[assistant] erreur:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
