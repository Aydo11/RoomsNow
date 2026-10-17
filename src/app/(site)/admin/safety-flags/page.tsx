import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { timeAgo } from "@/lib/format";
import { AdminPagination, ADMIN_PAGE_SIZE, pageNumber } from "@/components/admin-pagination";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { adminNav } from "../nav";
import { AddBlockedPhraseForm } from "@/components/blocked-phrase-form";
import { removeBlockedPhraseAction } from "@/server/actions/safety";
import { BUILT_IN_BLOCK_SUMMARY } from "@/lib/blocked-content-patterns";

export const metadata = { title: "Safety flags" };
export const dynamic = "force-dynamic";

function exactDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(date);
}

/**
 * Messages that matched rental-scam wording. Only the flagged message is
 * shown (not the whole conversation), so admins see what they need to judge
 * the risk and no more.
 */
export default async function SafetyFlagsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const page = pageNumber((await searchParams).page);
  const where = { action: { in: ["safety.message_flagged", "safety.content_blocked"] } };
  const [nav, total, flags, phrases] = await Promise.all([
    adminNav(),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE }),
    db.blockedPhrase.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  // Blocked attempts were never saved as messages, so show who tried.
  const actors = await db.user.findMany({
    where: { id: { in: flags.filter((flag) => flag.action === "safety.content_blocked" && flag.actorId).map((flag) => flag.actorId as string) } },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, staffOf: { select: { company: { select: { id: true, name: true, verification: true } } }, take: 1 } },
  });
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));
  const messages = await db.message.findMany({
    where: { id: { in: flags.flatMap((flag) => (flag.targetId ? [flag.targetId] : [])) } },
    select: {
      id: true,
      body: true,
      sender: { select: { id: true, firstName: true, lastName: true, email: true, role: true, staffOf: { select: { company: { select: { id: true, name: true, verification: true } } }, take: 1 } } },
      conversation: { select: { listing: { select: { id: true, title: true } } } },
    },
  });
  const byId = new Map(messages.map((message) => [message.id, message]));

  return (
    <DashboardShell
      title="Safety flags"
      subtitle="Flagged messages were delivered but mention things often seen in rental scams. Blocked attempts were stopped before sending. Check each one and act on the sender if needed."
      nav={nav}
      active="/admin/safety-flags"
    >
      <section className="card mb-8 p-5">
        <h2 className="text-lg">Blocked words and links</h2>
        <p className="mt-1 max-w-[70ch] text-[14px] text-ink-soft">These can never be sent in messages or put in adverts:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-ink-soft">
          {BUILT_IN_BLOCK_SUMMARY.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <p className="mt-4 max-w-[70ch] text-[14px] text-ink-soft">Add your own. Blocked words stop the message or advert; flagged words let it through and alert you.</p>
        <AddBlockedPhraseForm />
        {phrases.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {phrases.map((row) => (
              <li key={row.id} className="flex items-center gap-2 rounded-full border border-line px-3 py-1 text-[14px]">
                <span>{row.phrase}</span>
                <span className={`text-[12px] ${row.action === "FLAG" ? "text-ink-faint" : "text-clay"}`}>{row.action === "FLAG" ? "flag" : "block"}</span>
                <form action={removeBlockedPhraseAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit" className="text-[12px] text-ink-soft hover:text-clay" aria-label={`Remove ${row.phrase}`}>Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {flags.length === 0 ? (
        <p className="text-[15px] text-ink-soft">Nothing has been flagged or blocked yet.</p>
      ) : (
        <>
          <DataTable head={["When", "Sender", "Message", "Why", "Advert"]}>
            {flags.map((flag) => {
              const meta = (flag.metadata ?? {}) as { signals?: string[]; reason?: string; excerpt?: string; where?: string };
              if (flag.action === "safety.content_blocked") {
                const actor = flag.actorId ? actorById.get(flag.actorId) : undefined;
                const actorCompany = actor?.staffOf[0]?.company;
                return (
                  <tr key={flag.id}>
                    <td className="whitespace-nowrap px-4 py-3" title={exactDate(flag.createdAt)}>{timeAgo(flag.createdAt)}</td>
                    <td className="px-4 py-3">
                      {actor ? (
                        <>
                          <span className="block">{actor.firstName} {actor.lastName}</span>
                          <span className="block text-[12px] text-ink-faint">{actor.email} · {actor.role.toLowerCase()}</span>
                          {actorCompany && <span className="block text-[12px] text-ink-faint">{actorCompany.name} · {actorCompany.verification === "APPROVED" ? "verified" : "not verified"}</span>}
                        </>
                      ) : "Unknown"}
                    </td>
                    <td className="max-w-[360px] px-4 py-3 text-[14px]">{meta.excerpt ?? "—"}</td>
                    <td className="px-4 py-3 text-[13px]"><span className="font-semibold text-clay">Blocked {meta.where === "advert" ? "advert" : "message"}</span><span className="block text-ink-soft">{meta.reason}</span></td>
                    <td className="px-4 py-3">{meta.where === "advert" && flag.targetId ? <Link href={`/listings/${flag.targetId}`} className="text-pine-dark hover:underline">View advert</Link> : "—"}</td>
                  </tr>
                );
              }
              const message = flag.targetId ? byId.get(flag.targetId) : undefined;
              const company = message?.sender.staffOf[0]?.company;
              return (
                <tr key={flag.id}>
                  <td className="whitespace-nowrap px-4 py-3" title={exactDate(flag.createdAt)}>{timeAgo(flag.createdAt)}</td>
                  <td className="px-4 py-3">
                    {message ? (
                      <>
                        <span className="block">{message.sender.firstName} {message.sender.lastName}</span>
                        <span className="block text-[12px] text-ink-faint">{message.sender.email} · {message.sender.role.toLowerCase()}</span>
                        {company && (
                          <Link href={`/admin/companies?q=${encodeURIComponent(company.name)}`} className="block text-[12px] text-pine-dark hover:underline">
                            {company.name} · {company.verification === "APPROVED" ? "verified" : "not verified"}
                          </Link>
                        )}
                      </>
                    ) : <span className="text-ink-soft">Message deleted</span>}
                  </td>
                  <td className="max-w-[360px] px-4 py-3 text-[14px]">{message?.body ?? "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-ink-soft"><span className="block font-semibold text-ink">Flagged</span>{(meta.signals ?? []).join("; ")}</td>
                  <td className="px-4 py-3">
                    {message?.conversation.listing ? <Link href={`/listings/${message.conversation.listing.id}`} className="text-pine-dark hover:underline">{message.conversation.listing.title}</Link> : "—"}
                  </td>
                </tr>
              );
            })}
          </DataTable>
          <AdminPagination page={page} total={total} />
        </>
      )}
    </DashboardShell>
  );
}
