import { removePushSubscriptionAction, savePushSubscriptionAction } from "@/data/actions/push";
import { publicEnv } from "@/lib/env";

const SOMETHING_WRONG = "Er ging iets mis. Probeer het opnieuw.";

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// Registering again is a no-op for a worker that is already there, and swaps in a new build of it.
const register = () =>
  navigator.serviceWorker.register(new URL("./service-worker.js", import.meta.url), { scope: "/", updateViaCache: "none" });

// The VAPID key is base64url; atob accepts it without padding once - and _ are mapped back.
const keyBytes = (base64url: string) =>
  Uint8Array.from(atob(base64url.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export async function pushStatus(): Promise<"unsupported" | "denied" | "on" | "off"> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    return (await (await register()).pushManager.getSubscription()) ? "on" : "off";
  } catch {
    return "off";
  }
}

// Call it directly in a click handler: iOS only shows the permission prompt for a tap, so the prompt is the first await.
// Throws an Error with a Dutch message when something else goes wrong, e.g. the limit of 10 devices.
export async function subscribeToPush(): Promise<"ok" | "denied" | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  if ((await Notification.requestPermission()) !== "granted") return "denied";

  // Right after the permission prompt on desktop the first subscribe can fail while the worker settles: one more try, in this same tap.
  const subscribe = async () => {
    await register();
    return (await navigator.serviceWorker.ready).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicEnv.vapidPublicKey),
    });
  };
  let subscription: PushSubscription;
  try {
    subscription = await subscribe().catch(subscribe);
  } catch {
    throw new Error(SOMETHING_WRONG);
  }
  const saved = await savePushSubscriptionAction(subscription.toJSON()).catch(() => null);
  if (!saved?.ok) {
    // Keep the device and the server in step: a browser subscription without a row would never get a message.
    await subscription.unsubscribe().catch(() => {});
    throw new Error(saved ? saved.error : SOMETHING_WRONG);
  }
  return "ok";
}

// Best effort, never throws: logout calls it first, with a time limit. The browser unsubscribes in parallel with the server
// removal, so a slow server can never leave this device subscribed. A row that stays behind gets a 404 or 410 from the push
// service and is wiped by the cron.
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const subscription = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
    if (!subscription) return;
    await Promise.allSettled([removePushSubscriptionAction(subscription.endpoint), subscription.unsubscribe()]);
  } catch {
    // nothing to undo
  }
}
