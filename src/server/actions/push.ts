"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { pushToUser } from "@/lib/web-push";
import { isPushEndpoint } from "@/lib/push-endpoint";

type Input = { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string };

/** Saves this phone or browser so it gets RoomsNow notifications. */
export async function savePushSubscriptionAction(input: Input): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const limit = await rateLimit(`push-subscribe:${user.id}`, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.ok) return { ok: false, message: "Too many tries. Try again later." };

  const endpoint = String(input?.endpoint ?? "");
  const p256dh = String(input?.keys?.p256dh ?? "");
  const auth = String(input?.keys?.auth ?? "");
  if (!isPushEndpoint(endpoint) || !/^[A-Za-z0-9_-]{80,100}$/.test(p256dh) || !/^[A-Za-z0-9_-]{16,32}$/.test(auth)) {
    return { ok: false, message: "This browser gave us a notification address we can't use." };
  }

  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh, auth, userAgent: input.userAgent?.slice(0, 200) ?? null },
    update: { userId: user.id, p256dh, auth, userAgent: input.userAgent?.slice(0, 200) ?? null },
  });
  return { ok: true };
}

/** Stops notifications to this phone or browser. */
export async function removePushSubscriptionAction(endpoint: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await db.pushSubscription.deleteMany({ where: { endpoint: String(endpoint ?? ""), userId: user.id } });
  return { ok: true };
}

/** Sends a test notification to all of the signed-in person's devices. */
export async function sendTestPushAction(): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const limit = await rateLimit(`push-test:${user.id}`, { limit: 5, windowMs: 60 * 60_000 });
  if (!limit.ok) return { ok: false, message: "You've sent a few tests already. Try again later." };
  const count = await db.pushSubscription.count({ where: { userId: user.id } });
  if (!count) return { ok: false, message: "Turn notifications on first." };
  await pushToUser(user.id, {
    title: "Notifications are on",
    body: "You'll hear from RoomsNow here when there's news, like new rooms for your alerts or a new message.",
    url: "/dashboard/notifications",
    tag: "test",
  });
  return { ok: true, message: "Sent. It should arrive in a few seconds." };
}
