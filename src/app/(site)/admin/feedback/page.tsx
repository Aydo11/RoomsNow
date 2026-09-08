import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { ReportDecision } from "@/components/admin-controls";
import { adminNav } from "../nav";
import { shortDate } from "@/lib/format";
import { decodeFeedback, FEEDBACK_MARKER } from "@/lib/feedback";

export const metadata = { title: "Site feedback" };
export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  await requireAdmin();
  const [nav, feedback] = await Promise.all([adminNav(), db.report.findMany({ where: { detail: { startsWith: FEEDBACK_MARKER } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100, include: { reporter: { select: { firstName: true, lastName: true, email: true, role: true } } } })]);
  return <DashboardShell title="Site feedback" subtitle="Review bugs, ideas and usability feedback sent by RoomsNow members." nav={nav} active="/admin/feedback">{feedback.length === 0 ? <EmptyState title="No feedback yet" body="Member feedback will appear here." /> : <ul className="space-y-4">{feedback.map((item) => { const parsed = decodeFeedback(item.detail); return <li key={item.id} className="card p-5"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="chip chip-active">{parsed.category.toLowerCase()}</span><span className="chip">{item.status.toLowerCase()}</span></div><h2 className="mt-3 text-[19px]">{parsed.title}</h2><p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">{parsed.message}</p>{parsed.pageUrl && <a href={parsed.pageUrl} className="mt-3 block break-all text-[13px] text-pine-dark underline">{parsed.pageUrl}</a>}<p className="mt-4 text-[12px] text-ink-faint">{item.reporter.firstName} {item.reporter.lastName} · {item.reporter.email} · {item.reporter.role.toLowerCase()} · {shortDate(item.createdAt)}</p></div><div className="sm:w-[300px]"><ReportDecision id={item.id} initialResolution={item.resolution ?? ""} archived={Boolean(item.archivedAt)} /></div></div></li>; })}</ul>}</DashboardShell>;
}
