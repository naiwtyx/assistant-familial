import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import { canMemberUseAi } from "@/features/family/lib/ai-access";
import { buildProposedAction, writeToolToActionType, type ProposedAction } from "@/lib/ai/actions";
import { buildExecutors, selectTools } from "@/lib/ai/build-tools";
import { getErrorMessage } from "@/lib/get-error-message";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30; // laisse le temps à la boucle d'outils sans être tué trop tôt

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
Tu aides une famille à gérer : liste de courses, inventaire, recettes, planificateur de repas
(créneaux « midi »/« soir »), tâches/corvées, agenda familial, idées/suggestions et budget
(dépenses). Utilise les fonctions de LECTURE (get…) pour connaître l'état réel avant de répondre.

IMPORTANT — comment agir :
- Les actions d'AJOUT et de CRÉATION (addShoppingItem, updateInventory, planMeal, createRecipe,
  addChore, addEvent, addIdea) ne s'exécutent PAS immédiatement : elles sont PROPOSÉES à
  l'utilisateur, qui les confirme d'un tap dans l'interface. Quand tu appelles l'un de ces
  outils, considère l'action comme « proposée, en attente de confirmation » — surtout NE dis
  jamais qu'elle est déjà faite. Formule une courte proposition (« Je te propose d'ajouter… »).
- Tu peux proposer plusieurs actions d'un coup (ex. plusieurs ingrédients manquants) : appelle
  l'outil une fois par action, elles seront regroupées et confirmées ensemble.
- Les autres opérations (suppressions, modifications) s'exécutent directement — sois prudent.

Les dates sont au format AAAA-MM-JJ. Ne planifie que des recettes existantes (getRecipes) ;
pour assigner une tâche, retrouve le prénom exact avec getFamilyMembers. Le budget est réservé
aux parents. Sois concis, amical, en français. N'invente jamais de données.`;

const MAX_TOOL_ROUNDS = 4;

/**
 * Llama sur Groq échoue parfois à formater un appel d'outil (« tool_use_failed » :
 * il écrit la fonction en texte au lieu du format structuré). C'est stochastique.
 */
function isToolUseFailed(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error);
  return /tool_use_failed|not in request\.tools/i.test(message);
}

type CompletionParams = Parameters<Groq["chat"]["completions"]["create"]>[0];

/**
 * Appelle Groq en réessayant sur « tool_use_failed » — mais en variant la
 * température à chaque tentative : re-tenter la génération à l'identique
 * (température fixe) reproduirait le même raté. Une température plus haute
 * perturbe la génération et casse la boucle. Max 3 tentatives.
 */
async function createCompletion(
  groq: Groq,
  params: CompletionParams,
): Promise<Groq.Chat.Completions.ChatCompletion> {
  const temperatures = [0.2, 0.5, 0.8];
  let lastError: unknown;
  for (const temperature of temperatures) {
    try {
      const completion = await groq.chat.completions.create({ ...params, temperature });
      return completion as Groq.Chat.Completions.ChatCompletion;
    } catch (error) {
      lastError = error;
      if (!isToolUseFailed(error)) throw error;
    }
  }
  throw lastError;
}

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
    .select("id,ai_min_age")
    .order("created_at", { ascending: true })
    .limit(1);
  const family = families?.[0];
  const familyId = family?.id;
  if (!familyId) {
    return NextResponse.json({ error: "Aucune famille active." }, { status: 400 });
  }

  // Accès à l'IA : droit retiré par un parent, ou âge insuffisant selon le réglage familial.
  const { data: membership } = await supabase
    .from("family_members")
    .select("role,can_use_ai,birth_date")
    .eq("family_id", familyId)
    .eq("user_id", user.id)
    .single();
  const allowed = membership
    ? canMemberUseAi({
        role: membership.role,
        canUseAi: membership.can_use_ai,
        birthDate: membership.birth_date,
        minAge: family.ai_min_age,
      })
    : true;
  if (!allowed) {
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

  // Ne transmet à l'IA que les outils pertinents pour la demande courante
  // (fiabilité du tool-calling). Toutes les capacités restent disponibles.
  const lastUserText =
    [...parsed.data.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const tools = selectTools(lastUserText);

  const now = new Date();
  const todayLabel = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const todayIso = now.toISOString().slice(0, 10);

  // Ne renvoie que les derniers échanges : l'historique complet est re-transmis
  // à chaque tour d'outil, ce qui consomme beaucoup de tokens (quota Groq).
  const recentMessages = parsed.data.messages.slice(-10);

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nDate du jour : ${todayLabel} (${todayIso}). Calcule les dates des repas (« aujourd'hui », « demain », « cette semaine »…) à partir de cette date, au format AAAA-MM-JJ.`,
    },
    ...recentMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  // Actions d'ajout/création proposées à l'utilisateur (dédupliquées par libellé).
  const proposedActions: ProposedAction[] = [];

  try {
    let completion = await createCompletion(groq, {
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

      // ...puis, pour chaque outil : soit on PROPOSE l'action (ajout/création),
      // soit on l'exécute (lecture, ou écriture non gérée par la couche d'actions).
      for (const call of message.tool_calls) {
        let result: string;
        try {
          const args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
          if (writeToolToActionType(call.function.name)) {
            const built = buildProposedAction(call.function.name, args);
            if (built.ok) {
              const isDuplicate = proposedActions.some((a) => a.label === built.action.label);
              if (!isDuplicate) proposedActions.push(built.action);
              result = `Action proposée à l'utilisateur (en attente de confirmation) : « ${built.action.label} ». Ne dis pas qu'elle est faite.`;
            } else {
              result = `Impossible de préparer l'action : ${built.error}`;
            }
          } else {
            const executor = executors[call.function.name];
            result = executor ? await executor(args) : `Outil inconnu : ${call.function.name}`;
          }
        } catch (error) {
          result = `Erreur lors de l'exécution : ${getErrorMessage(error)}`;
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }

      completion = await createCompletion(groq, {
        model,
        messages,
        tools,
        tool_choice: "auto",
      });
      message = completion.choices[0]?.message;
    }

    return NextResponse.json({ text: message?.content ?? "", actions: proposedActions });
  } catch (error) {
    console.error("[assistant] erreur:", error);
    // Limite quotidienne Groq atteinte : message clair (+ délai si connu).
    if (isRateLimited(error)) {
      const wait = extractRetryDelay(error);
      return NextResponse.json(
        {
          error: `Limite quotidienne de l'assistant atteinte.${wait ? ` Réessaie dans ${wait}.` : " Réessaie plus tard."}`,
        },
        { status: 429 },
      );
    }
    // Message clair plutôt que le 400 brut de Groq quand le modèle bloque.
    if (isToolUseFailed(error)) {
      return NextResponse.json(
        { error: "L'assistant a eu un raté. Reformule ou réessaie en une phrase simple." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

function isRateLimited(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const message = String((error as { message?: unknown })?.message ?? error);
  return status === 429 || /rate.?limit|rate_limit_exceeded|too many requests/i.test(message);
}

/** Extrait un délai lisible (« 8m14s », « 30s ») du message Groq, si présent. */
function extractRetryDelay(error: unknown): string | null {
  const message = String((error as { message?: unknown })?.message ?? error);
  const match = message.match(/try again in ([0-9hms.]+)/i);
  const delay = match?.[1];
  if (!delay) return null;
  return delay.replace(/\.\d+s/, "s"); // « 8m14.208s » -> « 8m14s »
}
