// Avisos do magnética.hub no celular (notificações das novidades das lojas).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { texto: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "magnética.hub", {
    body: d.texto || "Novidade no Hub",
    icon: "/analises/portal/icon-192.png",
    badge: "/analises/portal/icon-192.png",
    data: { url: d.url || "/analises/portal/empresa/novidades/" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/analises/portal/empresa/novidades/";
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of abertas) { if ("navigate" in c) { await c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  })());
});
