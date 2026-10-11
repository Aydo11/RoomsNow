import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { adminNav } from "../../nav";

export const metadata = { title: "Audit entry" };
export const dynamic = "force-dynamic";

function exactDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "long", timeZone: "Europe/London" }).format(date);
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-[12px] font-medium uppercase tracking-wide text-ink-faint">{label}</p><div className="mt-1 wrap-break-word text-[14px] text-ink-soft">{children}</div></div>;
}

export default async function AdminAuditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [nav, entry] = await Promise.all([adminNav(), db.auditLog.findUnique({ where: { id }, include: { actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } } })]);
  if (!entry) notFound();
  const metadata = entry.metadata == null ? "No additional metadata" : JSON.stringify(entry.metadata, null, 2);

  return <DashboardShell title="Audit entry details" subtitle={`Immutable record ${entry.id.slice(-10)}`} nav={nav} active="/admin/audit">
    <Link className="text-[14px] text-pine-dark hover:underline" href="/admin/audit">← Back to audit log</Link>
    <section className="card mt-4 p-5">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Fact label="Exact time">{exactDate(entry.createdAt)}</Fact>
        <Fact label="Action">{entry.action}</Fact>
        <Fact label="Actor">{entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName} · ${entry.actor.email}` : "System process"}</Fact>
        <Fact label="Actor ID">{entry.actorId ?? "—"}</Fact>
        <Fact label="Target type">{entry.targetType ?? "—"}</Fact>
        <Fact label="Target ID">{entry.targetId ?? "—"}</Fact>
        <Fact label="IP address">{entry.ip ?? "Not recorded"}</Fact>
        <Fact label="Audit ID">{entry.id}</Fact>
      </div>
      <div className="mt-6 border-t border-line pt-5"><p className="text-[12px] font-medium uppercase tracking-wide text-ink-faint">Metadata</p><pre className="mt-2 max-h-[440px] overflow-auto rounded-card border border-line bg-canvas p-4 text-[12px] leading-5 text-ink-soft">{metadata}</pre></div>
    </section>
  </DashboardShell>;
}
