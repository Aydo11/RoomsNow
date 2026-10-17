import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { timeAgo } from "@/lib/format";
import { AdminPagination, ADMIN_PAGE_SIZE, pageNumber } from "@/components/admin-pagination";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { adminNav } from "../nav";

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
  const where = { action: "safety.message_flagged" };
  const [nav, total, flags] = await Promise.all([
    adminNav(),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE }),
  ]);
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
      subtitle="Messages that mention things often seen in rental scams, such as paying before a viewing, bank transfers or gift cards. They were still delivered. Check each one and act on the sender if needed."
      nav={nav}
      active="/admin/safety-flags"
    >
      {flags.length === 0 ? (
        <p className="text-[15px] text-ink-soft">No messages have been flagged.</p>
      ) : (
        <>
          <DataTable head={["When", "Sender", "Message", "Why flagged", "Advert"]}>
            {flags.map((flag) => {
              const message = flag.targetId ? byId.get(flag.targetId) : undefined;
              const meta = (flag.metadata ?? {}) as { signals?: string[] };
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
                  <td className="px-4 py-3 text-[13px] text-ink-soft">{(meta.signals ?? []).join("; ")}</td>
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
