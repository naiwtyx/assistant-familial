let reloading = false;

/**
 * Enregistre le service worker (cache hors ligne + push). Idempotent.
 *
 * Auto-mise à jour : quand un nouveau service worker prend le contrôle
 * (`controllerchange`), on recharge la page une fois. Combiné au
 * `skipWaiting()` + `clients.claim()` du SW, ça garantit qu'un nouveau
 * déploiement s'applique tout seul au prochain lancement — sans que
 * l'utilisateur reste bloqué sur une version en cache (fréquent sur les
 * PWA installées iOS).
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;

  // Recharge dès qu'un nouveau SW prend la main (une seule fois).
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    // Force une vérification de mise à jour à chaque montage (au lancement de
    // l'app), plutôt que d'attendre le cycle de vérification passif du navigateur.
    void registration.update();
    return registration;
  } catch {
    return null;
  }
}
