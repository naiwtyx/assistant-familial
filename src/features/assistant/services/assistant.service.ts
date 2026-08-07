export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Envoie l'historique de conversation à l'assistant IA et retourne sa réponse. */
export async function sendAssistantMessage(messages: ChatMessage[]): Promise<string> {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = (await response.json()) as { text?: string; error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error ?? "L'assistant n'a pas pu répondre.");
  }

  return data.text ?? "";
}
