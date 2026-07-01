/**
 * Traduit les erreurs d'authentification Supabase (anglais) en messages FR clairs.
 * On garde le message brut en dernier recours plutôt qu'un message générique opaque.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);

    if (message.includes("Invalid login credentials")) {
      return "Email ou mot de passe incorrect.";
    }
    if (message.includes("User already registered")) {
      return "Un compte existe déjà avec cet email.";
    }
    if (message.includes("Email not confirmed")) {
      return "Ton email n'est pas encore confirmé. Vérifie ta boîte mail.";
    }
    if (message.includes("Password should be at least")) {
      return "Mot de passe trop court (6 caractères minimum).";
    }
    if (message.includes("over_email_send_rate_limit") || message.includes("rate limit")) {
      return "Trop de tentatives. Patiente quelques instants.";
    }
    return message;
  }

  return "Une erreur est survenue. Réessaie.";
}
