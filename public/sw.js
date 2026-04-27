// Service Worker for RZTelegramaXYZ push notifications.
// Activates immediately so updates take effect on next reload.
// SW_VERSION bumped 2026-04-27.2 — drop broken empty fetch handler that hung PWA install.
const SW_VERSION = "2026-04-27.2";

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

// Android Chrome rotates push subscriptions periodically. Without this
// handler the server keeps a dead endpoint and pushes silently fail.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    try {
      const vapidRes = await fetch("/api/push/vapid");
      if (!vapidRes.ok) return;
      const { publicKey } = await vapidRes.json();
      if (!publicKey) return;

      const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const raw = atob(base64);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);

      const newSub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: arr,
      });

      // Tell the server about the new endpoint. Old endpoint will
      // 410-fail on next send and get cleaned up server-side.
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSub.toJSON()),
        credentials: "include",
      });
    } catch (err) {
      // Nothing useful to do; next page load will re-subscribe via lib/push.ts.
    }
  })());
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
