// Push only, no offline cache (spec 9). Plain JS: it is served as a static file and not compiled.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    // iOS wants a notification for every push, so a payload that is not JSON still shows the default title.
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Spaarplanner", { body: data.body, icon: "/icons/icon-192.png" }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const open = () => clients.openWindow("/storten");
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((all) => (all[0] ? all[0].focus().then((c) => c.navigate("/storten")) : open()))
      .catch(open), // navigate() refuses a window the worker does not control
  );
});
