import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { referrerPlanLimits } from "@/lib/billing";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { ClientFilters } from "@/components/client-filters";
import { ClientList, type ClientRow } from "@/components/client-list";
import { referrerNav } from "../nav";
import { clientPhotoSrc } from "@/lib/client-card";
import { PIPELINE_LABELS, SUPPORT_TYPES, supportLabel } from "@/lib/taxonomy";
import { ageFrom, shortDate, timeAgo } from "@/lib/format";
import { clsx } from "@/lib/clsx";

export const metadata = { title: "My clients" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 48;
const TABS = [
  { value: "ALL", label: "All current" },
  { value: "ACTIVE", label: "Active" },
  { value: "PLACED", label: "Placed" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "DELETED", label: "Deleted" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const SORTS: Record<string, Prisma.ClientOrderByWithRelationInput[]> = {
  updated: [{ updatedAt: "desc" }],
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  name: [{ firstName: "asc" }, { lastName: "asc" }],
  surname: [{ lastName: "asc" }, { firstName: "asc" }],
};

const pick = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

function parseDay(value: string, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireReferrer();
  const params = await searchParams;

  const q = pick(params.q).trim().slice(0, 80);
  const statusParam = pick(params.status).toUpperCase();
  const status: Tab = (TABS.some((t) => t.value === statusParam) ? statusParam : "ALL") as Tab;
  const support = SUPPORT_TYPES.some((t) => t.slug === pick(params.support)) ? pick(params.support) : "";
  const dateBy = pick(params.dateBy) === "updated" ? "updated" : "created";
  const from = parseDay(pick(params.from));
  const to = parseDay(pick(params.to), true);
  const sort = SORTS[pick(params.sort)] ? pick(params.sort) : "updated";
  const page = Math.max(1, Number.parseInt(pick(params.page), 10) || 1);

  const where: Prisma.ClientWhereInput = {
    referrerId: user.id,
    deletedAt: status === "DELETED" ? { not: null } : null,
    ...(status !== "ALL" && status !== "DELETED" ? { status } : {}),
    ...(support ? { supportTypes: { has: support } } : {}),
    ...(from || to ? { [dateBy === "updated" ? "updatedAt" : "createdAt"]: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
  if (q) {
    const words = q.split(/\s+/).slice(0, 3);
    where.AND = words.map((word) => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" } },
        { lastName: { contains: word, mode: "insensitive" } },
        { preferredLocation: { contains: word, mode: "insensitive" } },
        { email: { contains: word, mode: "insensitive" } },
      ],
    }));
  }

  const [nav, limits, total, clients, statusCounts, deletedCount] = await Promise.all([
    referrerNav(user.id),
    referrerPlanLimits(user.id),
    db.client.count({ where }),
    db.client.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { referrals: true, shares: { where: { revokedAt: null } } } },
        referrals: { orderBy: { updatedAt: "desc" }, take: 1, select: { status: true, updatedAt: true } },
      },
    }),
    db.client.groupBy({ by: ["status"], where: { referrerId: user.id, deletedAt: null }, _count: { _all: true } }),
    db.client.count({ where: { referrerId: user.id, deletedAt: { not: null } } }),
  ]);

  const countFor = (tab: Tab) => {
    if (tab === "DELETED") return deletedCount;
    if (tab === "ALL") return statusCounts.reduce((sum, row) => sum + row._count._all, 0);
    return statusCounts.find((row) => row.status === tab)?._count._all ?? 0;
  };
  const everHadClients = countFor("ALL") + deletedCount > 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tabHref = (tab: Tab) => {
    const next = new URLSearchParams();
    if (tab !== "ALL") next.set("status", tab);
    if (q) next.set("q", q);
    if (support) next.set("support", support);
    return `/referrals/clients${next.toString() ? `?${next}` : ""}`;
  };
  const pageHref = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = pick(value);
      if (v && key !== "page") next.set(key, v);
    }
    next.set("page", String(target));
    return `/referrals/clients?${next}`;
  };

  const rows: ClientRow[] = clients.map((client) => ({
    id: client.id,
    name: `${client.firstName} ${client.lastName}`,
    photo: clientPhotoSrc(client),
    status: client.deletedAt ? "DELETED" : client.status,
    age: client.dateOfBirth ? ageFrom(client.dateOfBirth) : null,
    location: client.preferredLocation,
    supportLabels: client.supportTypes.slice(0, 3).map(supportLabel),
    extraSupport: Math.max(0, client.supportTypes.length - 3),
    referrals: client._count.referrals,
    shares: client._count.shares,
    latestReferral: client.referrals[0] ? PIPELINE_LABELS[client.referrals[0].status] ?? client.referrals[0].status : null,
    added: shortDate(client.createdAt),
    updated: timeAgo(client.updatedAt),
    deleted: client.deletedAt ? shortDate(client.deletedAt) : null,
  }));

  return (
    <DashboardShell
      title="My clients"
      subtitle={
        limits.membership.maxClients === -1
          ? "Unlimited active clients on your plan."
          : `${limits.used.clients} of ${limits.membership.maxClients} active clients used on the ${limits.membership.name} plan. Archived and deleted clients don't count.`
      }
      nav={nav}
      active="/referrals/clients"
      action={
        <div className="flex flex-wrap gap-2">
          {limits.canAddClient ? (
            <Link href="/referrals/clients/new" className="btn-primary">Add a client</Link>
          ) : (
            <Link href="/referrals/membership" className="btn-secondary">Upgrade to add more</Link>
          )}
          <Link href="/referrals/clients/import" className="btn-secondary">Upload a spreadsheet</Link>
          {everHadClients && (
            <a href="/api/referrals/clients/export" className="btn-ghost">Export CSV</a>
          )}
        </div>
      }
    >
      {!everHadClients ? (
        <EmptyState
          title="No clients yet"
          body="Add the people you're supporting once — or upload your whole caseload from a spreadsheet — then refer them, or send their profile to a provider, in a couple of clicks."
          actionHref="/referrals/clients/new"
          actionLabel="Add a client"
        />
      ) : (
        <div className="space-y-4">
          <nav aria-label="Client status" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {TABS.map((tab) => (
              <Link
                key={tab.value}
                href={tabHref(tab.value)}
                aria-current={status === tab.value ? "page" : undefined}
                className={clsx(
                  "flex min-h-10 shrink-0 items-center gap-2 rounded-pill border px-3.5 text-[14px] transition-colors",
                  status === tab.value
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-white text-ink-soft hover:border-pine/40 hover:text-ink",
                )}
              >
                {tab.label}
                <span
                  className={clsx(
                    "rounded-pill px-1.5 text-[12px] tabular-nums",
                    status === tab.value ? "bg-white/20" : "bg-paper-sunk text-ink-faint",
                  )}
                >
                  {countFor(tab.value)}
                </span>
              </Link>
            ))}
          </nav>

          <ClientFilters
            key={status}
            status={status}
            q={q}
            support={support}
            dateBy={dateBy}
            from={pick(params.from)}
            to={pick(params.to)}
            sort={sort}
          />

          {status === "DELETED" && (
            <p className="rounded-[10px] bg-clay-light px-4 py-3 text-[14px] leading-relaxed text-clay">
              Deleted clients are hidden everywhere else and providers can no longer see them. Restore anyone
              you removed by mistake, or delete them permanently.
            </p>
          )}

          <p className="text-[13px] text-ink-faint" aria-live="polite">
            {total === 0
              ? "No clients match."
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
          </p>

          {rows.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-[16px] text-ink">
                {status === "DELETED" ? "Nothing in Deleted." : "No clients match these filters."}
              </p>
              <p className="mt-1 text-[14px] text-ink-soft">Try a different name, status or date range.</p>
            </div>
          ) : (
            <ClientList rows={rows} view={status === "DELETED" ? "deleted" : "current"} />
          )}

          {pages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-3 pt-2">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="btn-secondary">Previous</Link>
              ) : (
                <span />
              )}
              <span className="text-[13px] text-ink-faint">Page {page} of {pages}</span>
              {page < pages ? (
                <Link href={pageHref(page + 1)} className="btn-secondary">Next</Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
