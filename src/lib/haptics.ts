/**
 * Feedback haptique très léger, best-effort. Utilisé sur les actions clés
 * (checkbox, suppression, envoi) pour donner l'impression tactile d'une
 * application native. Silencieux sur les navigateurs qui ne supportent pas
 * l'API Vibration (iOS Safari) — l'action reste fonctionnelle.
 */

type Pattern = "light" | "medium" | "success" | "warning";

const PATTERNS: Record<Pattern, number | number[]> = {
  light: 8,
  medium: 14,
  success: [8, 30, 12],
  warning: [12, 40, 12],
};

export function haptic(pattern: Pattern = "light"): void {
  if (typeof window === "undefined") return;
  const nav = window.navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(PATTERNS[pattern]);
  } catch {
    /* silent */
  }
}
