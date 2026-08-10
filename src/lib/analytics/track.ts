import { createClient } from "@/lib/supabase/client";

/**
 * Noms d'événements produit suivis. Liste fermée pour éviter la dérive : on
 * mesure l'activation et l'usage réel, pas tout et n'importe quoi (section 17).
 */
export type AnalyticsEvent =
  | "app_open"
  | "onboarding_completed"
  | "ai_message_sent"
  | "ai_action_confirmed"
  | "receipt_scanned"
  | "shopping_item_added";

// La table/RPC analytics n'est pas dans les types générés : vue minimale non typée.
type UntypedRpc = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

/**
 * Journalise un événement d'usage (fire-and-forget). Ne bloque JAMAIS l'UI et
 * n'échoue jamais visiblement : l'analytics est secondaire par rapport à
 * l'action de l'utilisateur. `familyId` situe l'événement dans un foyer.
 */
export function track(
  name: AnalyticsEvent,
  props?: { familyId?: string | null } & Record<string, unknown>,
): void {
  try {
    const { familyId = null, ...rest } = props ?? {};
    const supabase = createClient();
    void (supabase as unknown as UntypedRpc)
      .rpc("track_event", {
        p_name: name,
        p_props: Object.keys(rest).length > 0 ? rest : null,
        p_family_id: familyId,
      })
      .then(() => {})
      .catch(() => {});
  } catch {
    // volontairement silencieux
  }
}
