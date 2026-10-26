// public/sw.js — Service Worker لإشعارات الدفع فقط (بلا تخزين مؤقّت للصفحات).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || "إتقان";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "لديك إشعار جديد",
      icon: "/brand/icon-192.png",
      badge: "/brand/icon-192.png",
      dir: "rtl",
      lang: "ar",
      data: { url: data.url || "/notifications" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || "/notifications";
  // مسار داخلي فقط.
  const path = typeof raw === "string" && raw.charAt(0) === "/" && raw.charAt(1) !== "/" ? raw : "/notifications";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
      for (const c of list) {
        if (c.url.indexOf(self.location.origin) === 0 && "focus" in c) {
          try {
            await c.focus();
            if ("navigate" in c) await c.navigate(target);
            return;
          } catch (e) {
            // نفتح نافذة جديدة أدناه.
          }
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
