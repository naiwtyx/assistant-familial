"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useActiveFamily, useMyMembership } from "@/features/family/components/family-provider";
import { createClient } from "@/lib/supabase/client";

import { ADMIN_EMAIL } from "../lib/features";

/**
 * Le foyer a-t-il l'Assistant Budget avancé (Premium) ? Lu depuis la famille
 * (injectée côté serveur). Défaut `true` si la colonne n'existe pas encore
 * (migration non appliquée) -> aucune régression.
 */
export function useIsPremium(): boolean {
  const family = useActiveFamily();
  return (family as { is_premium?: boolean }).is_premium ?? true;
}

/** Seul l'administrateur peut accorder/retirer le Premium. */
export function useIsAdmin(): boolean {
  const { email } = useMyMembership();
  return email?.toLowerCase() === ADMIN_EMAIL;
}

// Les RPC premium ne sont pas dans les types générés : appel via une vue
// minimale non typée (évite un `any` global).
type UntypedRpc = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

/** Active/désactive le Premium du foyer courant (admin uniquement, via la RPC). */
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
    onSuccess: () => router.refresh(),
  });
}

/** Accorde/retire le Premium au foyer d'un membre par son email (admin uniquement). */
export function useSetPremiumByEmail() {
  const router = useRouter();
  return useMutation({
    mutationFn: async ({ email, premium }: { email: string; premium: boolean }) => {
      const supabase = createClient();
      const { data, error } = await (supabase as unknown as UntypedRpc).rpc("set_premium_by_email", {
        p_email: email,
        p_premium: premium,
      });
      if (error) throw error;
      return typeof data === "number" ? data : 0; // nb de foyers modifiés
    },
    onSuccess: () => router.refresh(),
  });
}
