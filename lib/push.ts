// Client-side helpers: register the service worker and subscribe to Web Push.
// Silently no-ops when VAPID isn't configured or the browser doesn't support it.

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export type PushStatus =
  | "unsupported"
  | "permission-default"
  | "permission-denied"
  | "no-vapid"
  | "subscribed"
  | "error";

export async function registerPush(): Promise<PushStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "permission-denied";
  if (Notification.permission !== "granted") return "permission-default";

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
    await navigator.serviceWorker.ready;
    // Force an update check — helps when the SW on prod was cached before
    // today's push fixes shipped.
    try { await reg.update(); } catch { /* ignore */ }

    const vapidRes = await fetch("/api/push/vapid");
    if (!vapidRes.ok) return "no-vapid";
    const { publicKey } = await vapidRes.json();
    if (!publicKey) return "no-vapid";

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const raw = sub.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw),
    });
    return "subscribed";
  } catch (err) {
    console.warn("[push] registration failed", err);
    return "error";
  }
}

// Triggered by a user gesture — required for reliable permission prompts on
// Android Chrome. Returns the final status so the UI can react.
export async function enablePushWithGesture(): Promise<PushStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch { /* ignore */ }
  }
  return registerPush();
}
