import "server-only";
import webpush from "web-push";
import { publicEnv, serverEnv } from "@/lib/env";

const TTL = 12 * 60 * 60; // seconds: a payday reminder is stale by the next morning
const TIMEOUT = 10_000; // ms: one slow push service must not stall the cron

type Sub = { endpoint: string; p256dh: string; auth: string };

// 404 and 410 mean the browser dropped the subscription for good; anything else may be temporary.
// A bad VAPID config throws here, outside the try: it must fail the run loudly, not count as a failure of every device.
export async function sendPush(sub: Sub, payload: { title: string; body: string; url: string }): Promise<"ok" | "gone" | "error"> {
  const vapidDetails = { subject: serverEnv().vapidSubject, publicKey: publicEnv.vapidPublicKey, privateKey: serverEnv().vapidPrivateKey };
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), {
      TTL,
      timeout: TIMEOUT,
      vapidDetails,
    });
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("push failed", status ?? e);
    return "error";
  }
}
