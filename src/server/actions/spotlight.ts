"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/rbac";
import { checkBlockedContent } from "@/lib/blocked-content";
import { cleanSpotlightText, isSpotlightPackage } from "@/lib/spotlight";
import { activateSpotlight, organisationFor, orgSnapshot, startSpotlightCheckout } from "@/lib/spotlight-server";
import type { FormState } from "@/lib/validation";

const BLOCKED = "Spotlights can't include payment links, bank details or blocked words.";

/** A service business buys a homepage spotlight. It goes live as soon as payment clears. */
export async function buySpotlightAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/advertise/homepage");
  const org = await organisationFor(user.id);
  if (!org) return { ok: false, errors: { form: "Only approved service businesses and housing providers can buy a spotlight." } };
  const pkg = form.get("package");
  if (!isSpotlightPackage(pkg)) return { ok: false, errors: { package: "Choose how long you'd like the spotlight." } };
  const text = cleanSpotlightText({ headline: form.get("headline"), body: form.get("body") });
  if (!text.ok) return { ok: false, errors: text.errors };
  if (await checkBlockedContent(`${text.value.headline}\n${text.value.body}`, { actorId: user.id, where: "advert" })) return { ok: false, errors: { form: BLOCKED } };

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  let url: string;
  try {
    url = await startSpotlightCheckout({ org, text: text.value, pkg, userId: user.id, email: user.email, successUrl: `${appUrl}/advertise/homepage`, cancelUrl: `${appUrl}/advertise/homepage` });
  } catch (error) {
    console.error("[spotlight] checkout failed", error);
    return { ok: false, errors: { form: "Payment couldn't be started. Please try again in a moment." } };
  }
  await audit({ actorId: user.id, action: "spotlight.checkout_started", targetType: org.orgType, targetId: org.orgId, metadata: { pkg } });
  redirect(url);
}

/** Admin places a service business in the spotlight for free (e.g. a partner or an invoiced deal). */
export async function addSpotlightAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const [orgType, orgId] = String(form.get("org") || "").split(":");
  const org = await orgSnapshot(orgType ?? "", orgId ?? "");
  if (!org) return { ok: false, errors: { org: "Choose an approved service business or provider." } };
  const days = Number(form.get("days"));
  if (!Number.isInteger(days) || days < 1 || days > 365) return { ok: false, errors: { days: "Enter between 1 and 365 days." } };
  const text = cleanSpotlightText({ headline: form.get("headline"), body: form.get("body") });
  if (!text.ok) return { ok: false, errors: text.errors };
  await activateSpotlight({ org, text: text.value, days, amount: 0, externalPaymentId: null, actorId: admin.id });
  revalidatePath("/admin/spotlight");
  revalidatePath("/");
  return { ok: true, message: `${org.orgName} is in the spotlight for ${days} day${days === 1 ? "" : "s"}.` };
}

/** Pause, resume or end a spotlight. */
export async function updateSpotlightAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  const action = String(form.get("action") || "");
  const data = action === "pause" ? { status: "PAUSED" } : action === "resume" ? { status: "ACTIVE" } : action === "end" ? { endsAt: new Date() } : null;
  if (!data || !(await db.homepageSpotlight.findUnique({ where: { id }, select: { id: true } }))) return;
  await db.homepageSpotlight.update({ where: { id }, data });
  await audit({ actorId: admin.id, action: `admin.spotlight_${action}`, targetType: "HomepageSpotlight", targetId: id });
  revalidatePath("/admin/spotlight");
  revalidatePath("/");
}
