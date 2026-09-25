import "server-only";
import { db } from "./db";
import { encryptPayload, vapidAuthorization, vapidKeys, type PushMessage, type VapidKeys } from "./push-crypto";

export { vapidPublicKey, type PushMessage } from "./push-crypto";

/** Sending side of Web Push; the key handling and encryption live in push-crypto.ts. */

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };

/** Sends one message to one device. Returns false when the device has gone. */
async function sendOne(subscription: Subscription, message: PushMessage, keys: VapidKeys): Promise<boolean> {
  const body = encryptPayload(Buffer.from(JSON.stringify(message)), subscription);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: vapidAuthorization(subscription.endpoint, keys),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(60 * 60 * 24),
      Urgency: "normal",
      ...(message.tag ? { Topic: message.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || "roomsnow" } : {}),
    },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404 || response.status === 410) return false;
  if (!response.ok) {
    console.warn(`[push] ${new URL(subscription.endpoint).host} answered ${response.status}`);
  }
  return true;
}

/**
 * Sends to every device a user has turned notifications on for. Never throws:
 * push is a bonus on top of the in-app notification and email.
 */
export async function pushToUser(userId: string, message: PushMessage): Promise<void> {
  try {
    const keys = vapidKeys();
    if (!keys) return;
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
      take: 10,
    });
    if (!subscriptions.length) return;
    const results = await Promise.allSettled(subscriptions.map((subscription) => sendOne(subscription, message, keys)));
    const gone = subscriptions.filter((_, index) => {
      const result = results[index];
      return result.status === "fulfilled" && result.value === false;
    });
    const delivered = subscriptions.filter((_, index) => {
      const result = results[index];
      return result.status === "fulfilled" && result.value === true;
    });
    await Promise.all([
      gone.length ? db.pushSubscription.deleteMany({ where: { id: { in: gone.map((item) => item.id) } } }) : null,
      delivered.length
        ? db.pushSubscription.updateMany({ where: { id: { in: delivered.map((item) => item.id) } }, data: { lastUsedAt: new Date() } })
        : null,
    ]);
  } catch (error) {
    console.error("[push] failed", error);
  }
}
