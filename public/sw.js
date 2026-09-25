/*
 * RoomsNow service worker.
 *
 * Deliberately small: it doesn't cache pages (room availability must always be
 * live), it only shows a friendly offline page when there's no connection, and
 * it shows push notifications. Bump VERSION when this file changes.
 */
const VERSION = "roomsnow-sw-1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/app-icons/192", "/app-icons/badge"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode !== "navigate" || request.method !== "GET") return;
  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(request);
      } catch {
        const cache = await caches.open(VERSION);
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let message = { title: "RoomsNow", body: "You have something new on RoomsNow.", url: "/dashboard/notifications" };
  try {
    if (event.data) message = { ...message, ...event.data.json() };
  } catch {
    // Keep the generic message.
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: "/app-icons/192",
      badge: "/app-icons/badge",
      tag: message.tag,
      data: { url: message.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === target.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target.href);
          return;
        }
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});
