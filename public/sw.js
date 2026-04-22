// Service Worker for RZTelegramaXYZ push notifications.
// Activates immediately so updates take effect on next reload.
// SW_VERSION bumped 2026-04-22 to force re-install on prod clients.
const SW_VERSION = "2026-04-22.1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "RZTelegrama", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "RZTelegrama";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag,
    renotify: Boolean(data.tag),
    requireInteraction: data.requireInteraction === true,
    vibrate: [200, 100, 200],
    data: { url: data.url || "/desk", v: SW_VERSION },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/desk";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
