"use client";

import { Bell, BellOff, Check, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Convertit la clé VAPID (base64url) en BufferSource pour l'API Push. */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Gère l'abonnement aux notifications push : enregistre le Service Worker,
 * demande la permission, s'abonne via l'API Push et enregistre l'abonnement
 * côté serveur. Permet aussi d'envoyer une notification de test.
 */
export function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      Boolean(VAPID_PUBLIC_KEY);
    setSupported(isSupported);
    if (!isSupported) {
      setSubscribed(false);
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then(async (subscription) => {
        if (subscription) {
          // Auto-réparation : réenregistre l'abonnement côté serveur au cas où
          // il y aurait été perdu (ex. table créée après un 1er essai).
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: subscription.toJSON() }),
          }).catch(() => undefined);
        }
        setSubscribed(Boolean(subscription));
      })
      .catch(() => setSubscribed(false));
  }, []);

  async function enable() {
    if (!VAPID_PUBLIC_KEY) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Autorise les notifications dans les réglages du navigateur.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Échec de l'abonnement.");
      }

      setSubscribed(true);
      toast.success("Notifications activées");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notifications désactivées");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Échec de l'envoi.");
      toast.success("Notification de test envoyée 🔔");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-muted-foreground text-sm">
        Les notifications ne sont pas supportées sur cet appareil.
      </p>
    );
  }

  if (subscribed === null) {
    return <p className="text-muted-foreground text-sm">Chargement…</p>;
  }

  if (!subscribed) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">Reçois une alerte pour les rappels importants.</p>
        <Button size="sm" variant="outline" onClick={enable} disabled={busy}>
          <Bell className="size-4" />
          Activer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm text-emerald-600">
        <Check className="size-4" />
        Notifications activées sur cet appareil
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={sendTest} disabled={busy}>
          <Send className="size-4" />
          Tester
        </Button>
        <Button size="sm" variant="ghost" onClick={disable} disabled={busy}>
          <BellOff className="size-4" />
          Désactiver
        </Button>
      </div>
    </div>
  );
}
