"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { registerServiceWorker } from "@/lib/register-service-worker";

/**
 * Enregistre le service worker (cache hors ligne + notifications) au chargement
 * de l'app, et affiche un bandeau quand la connexion est perdue.
 */
export function OfflineSupport() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    void registerServiceWorker();

    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-center text-xs font-medium text-amber-950">
      <WifiOff className="size-3.5 shrink-0" />
      Hors ligne — affichage des données en cache
    </div>
  );
}
