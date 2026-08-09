"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useActiveFamily } from "@/features/family/components/family-provider";
import { createClient } from "@/lib/supabase/client";

/**
 * Le foyer a-t-il l'Assistant Budget avancé (Premium) ? Lu depuis la famille
 * (injectée côté serveur). Défaut `true` si la colonne n'existe pas encore
 * (migration non appliquée) -> aucune régression.
 */
export function useIsPremium(): boolean {
  const family = useActiveFamily();
  return (family as { is_premium?: boolean }).is_premium ?? true;
}

// La RPC set_family_premium n'est pas encore dans les types générés : appel via
// une vue minimale non typée (évite un `any` global).
type UntypedRpc = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
};

/** Active/désactive le Premium du foyer (réservé aux parents via la RPC). */
export function useSetPremium(familyId: string) {
  const router = useRouter();
  return useMutation({
    mutationFn: async (premium: boolean) => {
      const supabase = createClient();
      const { error } = await (supabase as unknown as UntypedRpc).rpc("set_family_premium", {
        p_family_id: familyId,
        p_premium: premium,
      });
      if (error) throw error;
    },
    // Recharge la famille injectée par le layout serveur.
    onSuccess: () => router.refresh(),
  });
}
