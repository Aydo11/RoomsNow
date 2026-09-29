import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";
import { SubmitButton } from "@/components/ui";
import { setSupportOrganisationStatusAction } from "@/server/actions/support-directory";
import { ensureSupportSeed } from "@/server/support-directory";
import { supportCategoryLabel } from "@/lib/support-directory";
import { shortDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import { adminNav } from "../nav";

export const metadata = { title: "Support services" };
export const dynamic = "force-dynamic";

const FILTERS = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
type Filter = (typeof FILTERS)[number];

export default async function AdminSupportServicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status: Filter = FILTERS.includes(raw as Filter) ? (raw as Filter) : "PENDING";
  await requireAdmin("MODERATION");
  await ensureSupportSeed();
  const [nav, counts, organisations, posts] = await Promise.all([
    adminNav(),
    db.supportOrganisation.groupBy({ by: ["status"], _count: true }),
    db.supportOrganisation.findMany({
      where: { status },
      orderBy: [{ createdAt: "desc" }],
      include: { owner: { select: { email: true, firstName: true, lastName: true } }, _count: { select: { locations: true, posts: true } } },
      take: 200,
    }),
    db.supportPost.count({ where: { removedAt: null } }),
  ]);
  const count = (key: Filter) => counts.find((row) => row.status === key)?._count ?? 0;

  return (
    <DashboardShell
      title="Support services"
      subtitle="The public directory of mental health, drug and alcohol, housing and other support. New organisations need approval before they show."
      nav={nav}
      active="/admin/support-services"
      action={<Link href="/support-services/join" className="btn-primary">Add a service</Link>}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard compact label="Waiting for approval" value={count("PENDING")} />
        <StatCard compact label="Live services" value={count("APPROVED")} />
        <StatCard compact label="Posts showing or saved" value={posts} />
        <StatCard compact label="Hidden or rejected" value={count("REJECTED") + count("SUSPENDED")} />
      </div>

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-1.5">
        {FILTERS.map((key) => (
          <Link key={key} href={`/admin/support-services?status=${key}`} className={clsx("chip", status === key && "chip-active")}>
            {key.charAt(0) + key.slice(1).toLowerCase()} ({count(key)})
          </Link>
        ))}
      </nav>

      <ul className="mt-4 space-y-3">
        {organisations.length === 0 && <li className="card p-6 text-center text-[14px] text-ink-soft">Nothing here.</li>}
        {organisations.map((org) => (
          <li key={org.id} className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  <Link href={`/support-services/${org.slug}`} className="hover:underline">{org.name}</Link>
                  {org.crisis && <span className="ml-2 rounded-pill bg-clay-light px-2 py-0.5 text-[11.5px] text-clay">Crisis line</span>}
                </p>
                <p className="mt-0.5 text-[13.5px] text-ink-soft">{org.summary}</p>
                <p className="mt-1 text-[12.5px] text-ink-faint">
                  {org.scope === "NATIONAL" ? "UK-wide" : org.areas.join(", ") || "Local"} · {org.categories.map(supportCategoryLabel).join(", ")} · {org._count.locations} locations · {org._count.posts} posts
                  {" · "}
                  {org.owner ? `Run by ${[org.owner.firstName, org.owner.lastName].filter(Boolean).join(" ") || org.owner.email} (${org.owner.email})` : org.seedKey ? "Added by RoomsNow" : "Added by admin"}
                  {" · "}Added {shortDate(org.createdAt)}
                </p>
                {org.phone && <p className="mt-1 text-[13px] text-ink">Phone: {org.phone}{org.website ? ` · ${org.website}` : ""}</p>}
              </div>
              <Link href={`/support-services/manage?org=${org.id}`} className="btn-secondary shrink-0">Edit</Link>
            </div>
            <form action={setSupportOrganisationStatusAction} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <input type="hidden" name="orgId" value={org.id} />
              <input name="reason" placeholder="Note to the organisation (for reject or hide)" className="field min-w-[220px] flex-1 py-2 text-[14px]" aria-label={`Note for ${org.name}`} />
              {org.status !== "APPROVED" && <SubmitButton name="status" value="APPROVED" className="btn-primary" pendingLabel="Saving…">Approve</SubmitButton>}
              {org.status === "PENDING" && <SubmitButton name="status" value="REJECTED" className="btn-danger" pendingLabel="Saving…">Reject</SubmitButton>}
              {org.status === "APPROVED" && <SubmitButton name="status" value="SUSPENDED" className="btn-danger" pendingLabel="Saving…">Hide</SubmitButton>}
            </form>
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
