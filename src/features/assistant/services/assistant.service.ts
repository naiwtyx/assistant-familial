export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Action proposée par l'IA (miroir client de `@/lib/ai/actions`, sans `server-only`). */
export type ProposedAction = {
  id: string;
  type: string;
  label: string;
  params: Record<string, unknown>;
};

/** Descripteur d'annulation opaque renvoyé par le serveur, à lui re-transmettre tel quel. */
export type UndoSpec = unknown;

export type ExecutedAction = {
  id: string;
  label: string;
  ok: boolean;
  summary: string;
  undo: UndoSpec;
};

export type AssistantReply = { text: string; actions: ProposedAction[] };

/** Abandonne une requête `fetch` après `ms` millisecondes (évite un spinner infini). */
async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("L'assistant met trop de temps à répondre. Réessaie.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Envoie l'historique à l'assistant et retourne sa réponse + les actions proposées. */
export async function sendAssistantMessage(messages: ChatMessage[]): Promise<AssistantReply> {
  const response = await fetchWithTimeout(
    "/api/assistant",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    },
    35000,
  );
  const data = (await response.json().catch(() => null)) as
    | { text?: string; actions?: ProposedAction[]; error?: string }
    | null;

  if (!response.ok || !data || data.error) {
    throw new Error(data?.error ?? "L'assistant n'a pas pu répondre.");
  }

  return { text: data.text ?? "", actions: data.actions ?? [] };
}

/** Confirme et exécute des actions proposées. Retourne un résultat par action. */
export async function executeActions(
  actions: { id: string; type: string; label: string; params: Record<string, unknown> }[],
): Promise<ExecutedAction[]> {
  const response = await fetch("/api/assistant/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actions }),
  });
  const data = (await response.json()) as { results?: ExecutedAction[]; error?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error ?? "Impossible d'exécuter les actions.");
  }
  return data.results ?? [];
}

/** Annule des actions précédemment exécutées (via leurs descripteurs undo). */
export async function undoActions(undo: UndoSpec[]): Promise<void> {
  const response = await fetch("/api/assistant/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ undo }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Impossible d'annuler.");
  }
}
