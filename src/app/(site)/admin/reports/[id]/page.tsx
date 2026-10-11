import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReportDecision } from "@/components/admin-controls";
import { adminNav } from "../../nav";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Report case" };
export const dynamic = "force-dynamic";

function exactDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(date);
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-[12px] font-medium uppercase tracking-wide text-ink-faint">{label}</p><div className="mt-1 text-[14px] text-ink-soft">{children}</div></div>;
}

export default async function AdminReportCasePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin("MODERATION");
  const { id } = await params;
  const [nav, report] = await Promise.all([
    adminNav(),
    db.report.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true } },
        events: { orderBy: { createdAt: "desc" }, include: { actor: { select: { firstName: true, lastName: true, email: true } } } },
      },
    }),
  ]);
  if (!report) notFound();

  const [message, listing, lookingForAd, company, user] = await Promise.all([
    report.targetType === "MESSAGE" ? db.message.findUnique({ where: { id: report.targetId }, include: { sender: { select: { firstName: true, lastName: true, email: true } }, conversation: { select: { subject: true } } } }) : null,
    report.targetType === "LISTING" ? db.listing.findUnique({ where: { id: report.targetId }, select: { id: true, reference: true, title: true, status: true, company: { select: { name: true } } } }) : null,
    report.targetType === "LOOKING_FOR_AD" ? db.lookingForAd.findUnique({ where: { id: report.targetId }, select: { id: true, title: true, city: true, status: true, user: { select: { firstName: true, lastName: true } } } }) : null,
    report.targetType === "COMPANY" ? db.company.findUnique({ where: { id: report.targetId }, select: { name: true, slug: true, status: true, verification: true, email: true } }) : null,
    report.targetType === "USER" ? db.user.findUnique({ where: { id: report.targetId }, select: { firstName: true, lastName: true, email: true, role: true, status: true, createdAt: true } }) : null,
  ]);

  await audit({ actorId: admin.id, action: "admin.report_evidence_viewed", targetType: "Report", targetId: report.id, metadata: { reportedTargetType: report.targetType } });

  let evidence: React.ReactNode = <p className="text-[14px] text-ink-faint">The original item is no longer available. The report and its case history have been retained.</p>;
  if (message) evidence = <div className="space-y-4"><Fact label="Conversation">{message.conversation.subject || "Direct conversation"}</Fact><Fact label="Sender">{message.sender.firstName} {message.sender.lastName} · {message.sender.email}</Fact><Fact label="Sent">{exactDate(message.createdAt)}</Fact><Fact label="Reported message"><div className="whitespace-pre-wrap rounded-card border border-line bg-canvas p-4 text-ink">{message.body}</div></Fact></div>;
  if (listing) evidence = <div className="grid gap-4 sm:grid-cols-2"><Fact label="Advert"><Link className="text-pine-dark hover:underline" href={`/listings/${listing.id}`}>{listing.title}</Link></Fact><Fact label="Reference">{listing.reference}</Fact><Fact label="Provider">{listing.company.name}</Fact><Fact label="Status">{listing.status.replace(/_/g, " ").toLowerCase()}</Fact></div>;
  if (lookingForAd) evidence = <div className="grid gap-4 sm:grid-cols-2"><Fact label="Looking-for advert"><Link className="text-pine-dark hover:underline" href={`/people/${lookingForAd.id}`}>{lookingForAd.title}</Link></Fact><Fact label="Person">{lookingForAd.user.firstName} {lookingForAd.user.lastName}</Fact><Fact label="Location">{lookingForAd.city}</Fact><Fact label="Status">{lookingForAd.status.toLowerCase()}</Fact></div>;
  if (company) evidence = <div className="grid gap-4 sm:grid-cols-2"><Fact label="Provider"><Link className="text-pine-dark hover:underline" href={`/companies/${company.slug}`}>{company.name}</Link></Fact><Fact label="Contact">{company.email}</Fact><Fact label="Status">{company.status.toLowerCase()}</Fact><Fact label="Verification">{company.verification.replace(/_/g, " ").toLowerCase()}</Fact></div>;
  if (user) evidence = <div className="grid gap-4 sm:grid-cols-2"><Fact label="User">{user.firstName} {user.lastName}</Fact><Fact label="Email">{user.email}</Fact><Fact label="Role">{user.role.toLowerCase()}</Fact><Fact label="Status">{user.status.toLowerCase()}</Fact></div>;

  return <DashboardShell title={`Report case ${report.id.slice(-8)}`} subtitle={`Opened ${exactDate(report.createdAt)} · last updated ${exactDate(report.updatedAt)}`} nav={nav} active="/admin/reports">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <Link className="text-[14px] text-pine-dark hover:underline" href="/admin/reports">← Back to reports</Link>
      {report.archivedAt ? <span className="rounded-full bg-sand px-3 py-1 text-[12px] font-medium">Archived {shortDate(report.archivedAt)}</span> : null}
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section className="card p-5">
          <h2 className="text-[19px]">Report received</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Fact label="Reason">{report.reason.replace(/_/g, " ").toLowerCase()}</Fact>
            <Fact label="Reported item">{report.targetType.replace(/_/g, " ").toLowerCase()}</Fact>
            <Fact label="Reporter">{report.reporter.firstName} {report.reporter.lastName} · {report.reporter.email}</Fact>
            <Fact label="Current status">{report.status.toLowerCase()}</Fact>
          </div>
          <div className="mt-5"><Fact label="Report details"><p className="whitespace-pre-wrap">{report.detail || "No further details were supplied."}</p></Fact></div>
        </section>
        <section className="card p-5"><h2 className="text-[19px]">Reported item snapshot</h2><div className="mt-4">{evidence}</div></section>
        <section className="card p-5">
          <h2 className="text-[19px]">Case history</h2>
          <ol className="mt-4 space-y-4 border-l border-line pl-5">
            {report.events.map((event) => <li key={event.id} className="relative"><span className="absolute left-[-25px] top-1.5 size-2 rounded-full bg-pine" /><p className="text-[14px] font-medium capitalize">{event.status.toLowerCase()}</p><p className="text-[12px] text-ink-faint">{exactDate(event.createdAt)} · {event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : "System"}</p>{event.note ? <p className="mt-1 whitespace-pre-wrap text-[14px] text-ink-soft">{event.note}</p> : null}</li>)}
            <li className="relative"><span className="absolute left-[-25px] top-1.5 size-2 rounded-full bg-line-strong" /><p className="text-[14px] font-medium">Report submitted</p><p className="text-[12px] text-ink-faint">{exactDate(report.createdAt)} · {report.reporter.firstName} {report.reporter.lastName}</p></li>
          </ol>
        </section>
      </div>
      <aside className="card h-fit p-5 xl:sticky xl:top-24"><h2 className="text-[19px]">Update case</h2><p className="mt-1 text-[13px] text-ink-faint">Changes are dated and stored in the case history.</p><div className="mt-4"><ReportDecision id={report.id} initialResolution={report.resolution ?? ""} archived={Boolean(report.archivedAt)} /></div></aside>
    </div>
  </DashboardShell>;
}
