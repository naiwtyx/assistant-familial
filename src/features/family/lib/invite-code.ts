/**
 * Génère un code d'invitation court et non ambigu (sans 0/O/1/I/L).
 * Utilise crypto.getRandomValues pour de l'aléatoire de qualité.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  let code = "";
  for (const value of values) {
    code += ALPHABET[value % ALPHABET.length];
  }
  return code;
}

/** Normalise un code saisi par l'utilisateur (espaces, casse). */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}
