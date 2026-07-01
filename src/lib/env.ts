import { z } from "zod";

/**
 * Validation centralisée des variables d'environnement.
 *
 * Les variables `NEXT_PUBLIC_*` sont injectées par Next au build : elles doivent
 * être référencées explicitement (pas d'accès dynamique) pour être inlinées.
 * En cas de configuration manquante/invalide, on échoue tôt avec un message clair.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL doit être une URL valide"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY est requise"),
});

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Variables d'environnement invalides. Vérifie ton fichier .env.local :\n${details}`,
  );
}

export const env = parsed.data;
