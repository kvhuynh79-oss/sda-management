/// <reference lib="webworker" />

export {};

const sw = self as unknown as ServiceWorkerGlobalScope;

// Push notification event handler
sw.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let data: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    requireInteraction?: boolean;
  };

  try {
    data = event.data.json();
  } catch {
    data = { title: "MySDAManager", body: event.data.text() };
  }

  const title = data.title || "MySDAManager";
  const options: NotificationOptions = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-96x96.png",
    tag: data.tag || "default",
    data: { url: data.url || "/dashboard" },
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(sw.registration.showNotification(title, options));
});

// Notification click handler - open the relevant page
sw.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(url);
      }
    })
  );
});
