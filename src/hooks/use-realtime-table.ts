"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Abonnement Supabase Realtime générique pour une table filtrée par famille.
 * À chaque changement (INSERT/UPDATE/DELETE), invalide la requête associée :
 * tous les appareils de la famille restent synchronisés.
 *
 * ⚠️ Le socket Realtime doit porter le jeton de session, sinon les RLS bloquent
 * la diffusion (connexion sinon anonyme).
 */
export function useRealtimeTable(table: string, familyId: string, queryKey: QueryKey) {
  const queryClient = useQueryClient();
  // Clé sérialisée -> dépendance stable malgré la nouvelle référence de tableau à chaque rendu.
  const queryKeyString = JSON.stringify(queryKey);

  useEffect(() => {
    const key = JSON.parse(queryKeyString) as QueryKey;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    async function subscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) await supabase.realtime.setAuth(session.access_token);
      if (cancelled) return;

      channel = supabase
        .channel(`${table}:${familyId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `family_id=eq.${familyId}` },
          () => {
            void queryClient.invalidateQueries({ queryKey: key });
          },
        )
        .subscribe();
    }

    void subscribe();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [table, familyId, queryKeyString, queryClient]);
}
