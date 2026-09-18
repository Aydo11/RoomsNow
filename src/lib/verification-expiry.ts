import "server-only";
import { db } from "./db";
import { notifyCompany } from "./notify";
import { shortDate } from "./format";

/** A month's notice is enough time for a provider to renew and resubmit before cover actually lapses. */
const REMINDER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Runs hourly (see scheduleInsuranceExpiryCheck) to catch a verified
 * provider's insurance evidence quietly lapsing. Verification is a one-time
 * manual check (see requestVerificationAction / reviewVerificationAction) —
 * nothing previously re-visited it once approved, so a badge could keep
 * showing "verified" long after the underlying cover ran out. This sends one
 * reminder per approved verification, at 30 days out or later (including
 * already-expired ones that predate this check), then leaves the badge and
 * review process alone — resubmitting evidence is still the provider's call,
 * same as first-time verification.
 */
export async function runInsuranceExpiryCheck() {
  const now = new Date();
  const threshold = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const approved = await db.verificationRequest.findMany({
    where: { type: "COMPANY", status: "APPROVED" },
    orderBy: { reviewedAt: "desc" },
    select: {
      id: true,
      companyId: true,
      insuranceExpiresAt: true,
      insuranceReminderSentAt: true,
    },
  });

  // A company can have more than one APPROVED row over time (re-verification
  // creates a new one rather than overwriting the old) — only the most
  // recent one is the badge's current evidence.
  const latestByCompany = new Map<string, (typeof approved)[number]>();
  for (const request of approved) {
    if (!latestByCompany.has(request.companyId)) latestByCompany.set(request.companyId, request);
  }

  let reminded = 0;
  for (const request of latestByCompany.values()) {
    if (!request.insuranceExpiresAt || request.insuranceReminderSentAt) continue;
    if (request.insuranceExpiresAt > threshold) continue;

    const expired = request.insuranceExpiresAt <= now;
    await notifyCompany(request.companyId, {
      type: "VERIFICATION",
      title: expired ? "Your insurance evidence has expired" : "Your insurance evidence expires soon",
      body: expired
        ? `The insurance evidence behind your verified badge expired on ${shortDate(request.insuranceExpiresAt)}. Submit current evidence to keep the badge accurate.`
        : `The insurance evidence behind your verified badge expires on ${shortDate(request.insuranceExpiresAt)}. Submit renewed evidence before then to keep it current.`,
      href: "/provider/settings",
      email: true,
    });
    await db.verificationRequest.update({ where: { id: request.id }, data: { insuranceReminderSentAt: now } });
    reminded++;
  }

  return { reminded };
}

let expiryCheckScheduled = false;

/**
 * Called once from instrumentation.ts when the server process boots. Runs
 * hourly alongside the saved-search digest and listing freshness check —
 * same in-process pattern, so this needs no new infrastructure either.
 */
export function scheduleInsuranceExpiryCheck() {
  if (expiryCheckScheduled) return;
  expiryCheckScheduled = true;

  const HOUR_MS = 60 * 60 * 1000;
  const run = () => {
    runInsuranceExpiryCheck().catch((error) => {
      console.error("[verification-expiry] failed", error);
    });
  };
  // Offset from the other two hourly jobs' boot delays so all three don't
  // land on the exact same tick every time.
  setTimeout(run, 450_000);
  setInterval(run, HOUR_MS);
}
