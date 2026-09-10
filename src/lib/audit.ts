import "server-only";
import { db } from "./db";

/**
 * Every email address the pre-launch mailshot has ever been sent to, lowercased.
 * There's no dedicated "signup source" column on Company — this reconstructs it from
 * the audit trail sendPreLaunchInvite() already writes (one admin.pre_launch_invite_sent
 * row per batch, metadata.recipients listing every address that actually sent), so a
 * provider's registration email can be checked against it to tell mailshot signups
 * from organic ones without a schema change.
 */
export async function mailshotRecipientEmails(): Promise<Set<string>> {
  const rows = await db.auditLog.findMany({
    where: { action: "admin.pre_launch_invite_sent" },
    select: { metadata: true },
  });
  const emails = new Set<string>();
  for (const row of rows) {
    const recipients = (row.metadata as { recipients?: unknown } | null)?.recipients;
    if (Array.isArray(recipients)) {
      for (const value of recipients) {
        if (typeof value === "string") emails.add(value.toLowerCase());
      }
    }
  }
  return emails;
}

/**
 * Append-only record of anything that touches personal data or moderation.
 * Never delete rows from this table — retention is handled by a scheduled job.
 */
export async function audit(params: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: (params.metadata ?? {}) as object,
        ip: params.ip ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write", params.action, error);
  }
}
