"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState, type ReactNode } from "react";

/**
 * Fournit le client TanStack Query à toute l'application, avec persistance dans
 * le localStorage : les données déjà chargées restent visibles hors ligne et au
 * rechargement (utile en magasin pour la liste de courses).
 *
 * Le `QueryClient` est créé une seule fois par montage pour conserver le cache.
 */
const ONE_DAY = 1000 * 60 * 60 * 24;

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 min : limite les refetchs inutiles
            gcTime: ONE_DAY, // conserve le cache assez longtemps pour la persistance
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      key: "af-query-cache",
    }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: ONE_DAY, buster: "v1" }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
