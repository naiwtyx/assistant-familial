// Service Worker — notifications push + repli hors ligne de l'Assistant Familial.
/* global self, caches, fetch, URL */

// Bumper cette version force l'`activate` à purger l'ancien cache — indispensable
// pour sortir d'un cache corrompu sur les PWA installées (surtout iOS).
const CACHE = "af-cache-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Purge TOUTES les anciennes versions du cache (y compris un cache
      // corrompu qui aurait stocké un chunk raté).
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

/**
 * Stratégie volontairement MINIMALE pour éviter toute une classe de bugs de
 * cache PWA (chunk périmé/raté servi en boucle -> crash au chargement) :
 *
 * - On ne met JAMAIS en cache les assets `/_next/static/*` : ils sont déjà
 *   immuables (hash dans le nom) et gérés parfaitement par le cache HTTP du
 *   navigateur. Les mettre en cache ici n'apporte rien et casse tout si une
 *   réponse ratée est stockée.
 * - Navigations : réseau d'abord, avec repli sur la dernière page en cache
 *   uniquement si on est hors ligne. On ne met en cache QUE les réponses OK.
 * - API et domaines externes : jamais interceptés.
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) return; // laissé au cache HTTP du navigateur

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("/dashboard");
        }),
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Assistant Familial";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
