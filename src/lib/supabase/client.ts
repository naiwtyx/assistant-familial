import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Client Supabase pour le navigateur (Client Components).
 *
 * Singleton : on réutilise la même instance dans tout l'onglet. Cela évite
 * d'ouvrir plusieurs connexions Realtime et garantit que la session (et donc
 * le jeton utilisé par Realtime) est partagée.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return browserClient;
}
