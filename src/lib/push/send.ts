import "server-only";

import webpush from "web-push";

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contact@assistant-familial.app",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

export type PushSubscriptionRecord = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url?: string };

/**
 * Envoie une notification à plusieurs abonnements en parallèle.
 * Retourne les endpoints expirés (404/410) que l'appelant doit supprimer.
 */
export async function sendPush(
  subscriptions: PushSubscriptionRecord[],
  payload: PushPayload,
): Promise<string[]> {
  if (!ensureConfigured() || subscriptions.length === 0) return [];

  const staleEndpoints: string[] = [];
  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        // Abonnement expiré / révoqué -> à nettoyer.
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(subscription.endpoint);
        }
      }
    }),
  );

  return staleEndpoints;
}
