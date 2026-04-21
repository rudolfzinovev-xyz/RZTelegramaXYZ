// Web Notifications helper.
// iOS Safari: works only when app is installed as PWA (standalone mode).

function supported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!supported()) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

interface NotifyOptions {
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  onClick?: () => void;
}

export function notify(title: string, body: string, opts: NotifyOptions = {}): Notification | null {
  if (!supported() || Notification.permission !== "granted") return null;
  try {
    const n = new Notification(title, {
      body,
      tag: opts.tag,
      requireInteraction: opts.requireInteraction,
      silent: opts.silent,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });
    n.onclick = () => {
      window.focus();
      opts.onClick?.();
      n.close();
    };
    return n;
  } catch {
    return null;
  }
}
