import { createClient } from "@/lib/supabase/client";

export type FeedbackKind = "bug" | "idea" | "other";

export type SubmitFeedbackInput = {
  kind: FeedbackKind;
  message: string;
  familyId: string | null;
  /** Contexte technique auto-attaché (page, appareil…) pour situer le retour. */
  context: Record<string, unknown>;
};

// La table/RPC feedback n'est pas dans les types générés : appel via une vue
// minimale non typée (même approche que les RPC premium).
type UntypedRpc = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

/**
 * Envoie un retour utilisateur (bug, idée, autre) via la RPC sécurisée.
 * L'écriture directe en table est impossible (RLS sans policy) : tout passe
 * par `submit_feedback`, qui attache l'auteur (auth.uid()) côté serveur.
 */
export async function submitFeedback(input: SubmitFeedbackInput): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as unknown as UntypedRpc).rpc("submit_feedback", {
    p_kind: input.kind,
    p_message: input.message.trim(),
    p_context: input.context,
    p_family_id: input.familyId,
  });
  if (error) throw error;
}

/** Contexte technique auto-collecté au moment de l'envoi (best-effort, jamais bloquant). */
export function collectFeedbackContext(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  return {
    path: window.location.pathname,
    userAgent: window.navigator.userAgent,
    language: window.navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    standalone,
    at: new Date().toISOString(),
  };
}
