import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Client Supabase avec la clé de service (bypass RLS). Réservé aux traitements
 * serveur sans session utilisateur (ex. tâches planifiées / cron).
 * Retourne `null` si la clé de service n'est pas configurée.
 *
 * ⚠️ Ne jamais importer ce module côté client : la clé de service est un secret.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
