"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/notify";
import { renderWeeklySummary, weeklyStatsFor } from "@/lib/weekly-summary";

/** Turns the Monday summary email on or off for the whole company. */
export async function setWeeklySummaryAction(on: boolean) {
  const { user, companyId } = await requireCompany();
  await db.company.update({ where: { id: companyId }, data: { weeklySummary: Boolean(on) } });
  await audit({ actorId: user.id, action: "company.weekly_summary", targetType: "Company", targetId: companyId, metadata: { on: Boolean(on) } });
  revalidatePath("/provider/settings");
  return { ok: true };
}

/**
 * Sends this week's summary to the company's email straight away, marked as a
 * test. It doesn't count as the Monday send, so the real one still goes out.
 */
export async function sendTestWeeklySummaryAction() {
  const { user, companyId } = await requireCompany();
  const limit = await rateLimit(`weekly-summary-test:${companyId}`, { limit: 5, windowMs: 60 * 60_000 });
  if (!limit.ok) return { ok: false, message: "You've sent a few tests already. Try again in an hour." };
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, tradingName: true, email: true, weeklySummaryViews: true },
  });
  if (!company) return { ok: false, message: "Company not found." };
  const { stats } = await weeklyStatsFor(companyId, company.weeklySummaryViews);
  const email = renderWeeklySummary(company.tradingName || company.name, stats);
  try {
    await sendEmail({ to: company.email, ...email, subject: `[Test] ${email.subject}` });
  } catch (error) {
    console.error("[weekly-summary] test send failed", error);
    return { ok: false, message: "The email couldn't be sent just now. Please try again." };
  }
  await audit({ actorId: user.id, action: "company.weekly_summary_test", targetType: "Company", targetId: companyId });
  return { ok: true, message: `Test sent to ${company.email}. It can take a minute to arrive.` };
}
