/**
 * Extrait un message lisible depuis une erreur inconnue (Supabase, RPC, Error…).
 * Les exceptions des fonctions SQL remontent leur message via `error.message`.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Une erreur est survenue. Réessaie.",
): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    return message.length > 0 ? message : fallback;
  }
  return fallback;
}
