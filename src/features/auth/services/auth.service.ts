import { createClient } from "@/lib/supabase/client";

import type { LoginInput, RegisterInput } from "../schemas/auth.schema";

/**
 * Couche métier de l'authentification (client navigateur).
 * Fonctions pures et réutilisables — ne contiennent aucune logique d'UI.
 */

export async function signUp({ email, password, displayName }: RegisterInput) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Repris par le trigger SQL handle_new_user() pour créer le profil.
      data: { display_name: displayName },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn({ email, password }: LoginInput) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
