import "server-only";
import { db } from "./db";
import { audit } from "./audit";
import { notify } from "./notify";
export { scamSignals } from "./scam-signal-patterns";
import { scamSignals } from "./scam-signal-patterns";

/**
 * Checks a new message for signs of a rental scam (asking for money before a
 * viewing, untraceable payment methods, moving off the platform to pay) and,
 * if found, alerts every full admin with a link to the conversation. The
 * message is still delivered: this flags for a human to check, it does not
 * block. Never throws.
 */
export async function flagScamSignals(input: { messageId: string; conversationId: string; senderId: string; body: string }) {
  try {
    const signals = scamSignals(input.body);
    if (!signals.length) return [];
    const [admins, sender] = await Promise.all([
      db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null, adminPermissions: { has: "ALL" } }, select: { id: true } }),
      db.user.findUnique({ where: { id: input.senderId }, select: { firstName: true, lastName: true, role: true } }),
    ]);
    await audit({
      actorId: input.senderId,
      action: "safety.message_flagged",
      targetType: "Message",
      targetId: input.messageId,
      metadata: { conversationId: input.conversationId, signals },
    });
    const who = sender ? `${sender.firstName} ${sender.lastName}`.trim() + ` (${sender.role.toLowerCase()})` : "A user";
    await Promise.all(
      admins.map((admin) =>
        notify({
          userId: admin.id,
          type: "SYSTEM",
          title: "Possible scam message",
          body: `${who} sent a message mentioning ${signals.join(", ")}. Check the conversation.`,
          href: "/admin/safety-flags",
        }),
      ),
    );
    return signals;
  } catch (error) {
    console.error("[scam-signals] flagging failed", error);
    return [];
  }
}
