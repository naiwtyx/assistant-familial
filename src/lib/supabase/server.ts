import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Client Supabase côté serveur (Server Components, Route Handlers, Server Actions).
 *
 * `cookies()` est asynchrone depuis Next 15 : ce helper doit être awaité.
 * La session est lue/écrite via les cookies de la requête en cours.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component (cookies en lecture seule).
            // Sans danger : le middleware se charge de rafraîchir la session.
          }
        },
      },
    },
  );
}
