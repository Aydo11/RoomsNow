import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { contactProgress, type SenderActivity } from "@/lib/contact-activity";
import { PIPELINE_LABELS } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/format";
import { AdminFilters, AdminFilterField } from "@/components/admin-filters";
import { AdminPagination, ADMIN_PAGE_SIZE, pageNumber } from "@/components/admin-pagination";
import { DashboardShell, DataTable, StatCard } from "@/components/dashboard-shell";
import { adminNav } from "../nav";

export const metadata = { title: "Contact activity" };
export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  provider?: string;
  kind?: string;
  from?: string;
  to?: string;
  page?: string;
};

function dateBoundary(value: string | undefined, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function exactDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(date);
}

export default async function AdminContactActivityPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const query = await searchParams;
  const page = pageNumber(query.page);
  const q = query.q?.trim().slice(0, 100) ?? "";
  const provider = query.provider?.trim().slice(0, 100) ?? "";
  const kind = ["listing", "looking", "direct"].includes(query.kind ?? "") ? query.kind : "";
  const from = dateBoundary(query.from);
  const to = dateBoundary(query.to, true);

  const [matchingProviders, searchedProviders] = await Promise.all([
    provider ? db.company.findMany({ where: { name: { contains: provider, mode: "insensitive" } }, select: { id: true } }) : Promise.resolve([]),
    q ? db.company.findMany({ where: { name: { contains: q, mode: "insensitive" } }, select: { id: true } }) : Promise.resolve([]),
  ]);

  const where: Prisma.ConversationWhereInput = {
    companyId: provider ? { in: matchingProviders.map((company) => company.id) } : { not: null },
    serviceBusinessId: null,
    ...(kind === "listing" ? { listingId: { not: null } } : kind === "looking" ? { lookingForAdId: { not: null } } : kind === "direct" ? { listingId: null, lookingForAdId: null } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(q ? { OR: [
      { participants: { some: { user: { OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ] } } } },
      { listing: { title: { contains: q, mode: "insensitive" } } },
      { lookingForAd: { title: { contains: q, mode: "insensitive" } } },
      { companyId: { in: searchedProviders.map((company) => company.id) } },
    ] } : {}),
  };

  const [nav, conversations, total, recent] = await Promise.all([
    adminNav(),
    db.conversation.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        companyId: true,
        createdAt: true,
        lastMessageAt: true,
        listing: { select: { id: true, title: true } },
        lookingForAd: { select: { id: true, title: true } },
        participants: {
          select: {
            companyId: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    }),
    db.conversation.count({ where }),
    db.conversation.count({ where: { AND: [where, { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) } }] } }),
  ]);

  const conversationIds = conversations.map((conversation) => conversation.id);
  const companyIds = [...new Set(conversations.map((conversation) => conversation.companyId).filter((id): id is string => Boolean(id)))];
  const [companies, senderGroups] = await Promise.all([
    companyIds.length ? db.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    conversationIds.length ? db.message.groupBy({
      by: ["conversationId", "senderId"],
      where: { conversationId: { in: conversationIds } },
      _min: { createdAt: true },
      _count: { _all: true },
    }) : Promise.resolve([]),
  ]);
  const companyNames = new Map(companies.map((company) => [company.id, company.name]));
  const activityByConversation = new Map<string, SenderActivity[]>();
  for (const group of senderGroups) {
    const activity = activityByConversation.get(group.conversationId) ?? [];
    activity.push({ senderId: group.senderId, firstAt: group._min.createdAt, messageCount: group._count._all });
    activityByConversation.set(group.conversationId, activity);
  }

  const rows = conversations.map((conversation) => {
    const providerUserIds = new Set(conversation.participants
      .filter((participant) => participant.companyId === conversation.companyId)
      .map((participant) => participant.user.id));
    const progress = contactProgress(activityByConversation.get(conversation.id) ?? [], providerUserIds);
    const people = conversation.participants.filter((participant) => !providerUserIds.has(participant.user.id));
    const person = people.find((participant) => participant.user.id === progress.firstSenderId)?.user ?? people[0]?.user;
    return { conversation, progress, person };
  });

  const listingIds = [...new Set(rows.map((row) => row.conversation.listing?.id).filter((id): id is string => Boolean(id)))];
  const personIds = [...new Set(rows.map((row) => row.person?.id).filter((id): id is string => Boolean(id)))];
  const requests = listingIds.length && personIds.length ? await db.accommodationRequest.findMany({
    where: { listingId: { in: listingIds }, applicantId: { in: personIds } },
    select: { listingId: true, applicantId: true, status: true },
  }) : [];
  const requestStatuses = new Map(requests.map((request) => [`${request.listingId}:${request.applicantId}`, request.status]));

  return (
    <DashboardShell
      title="Contact activity"
      subtitle="See which person contacted which accommodation provider and whether the conversation progressed. Message text, attachments and support details are not shown here."
      nav={nav}
      active="/admin/contact-activity"
      action={<div className="flex flex-wrap gap-2"><Link className="btn-secondary" href="/admin/requests">Room requests</Link><Link className="btn-secondary" href="/admin/referrals">Referrals</Link></div>}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard compact label="Matching conversations" value={total} />
        <StatCard compact label="Started in the last 30 days" value={recent} />
        <StatCard compact label="Provider replies on this page" value={rows.filter((row) => !row.progress.providerStarted && row.progress.label === "Provider replied").length} />
      </div>

      <div className="mt-5">
        <AdminFilters>
          <AdminFilterField label="Person, email or advert" wide><input className="field" name="q" defaultValue={q} placeholder="Search contacts" /></AdminFilterField>
          <AdminFilterField label="Provider"><input className="field" name="provider" defaultValue={provider} placeholder="Company name" /></AdminFilterField>
          <AdminFilterField label="Contact type"><select className="field" name="kind" defaultValue={kind}><option value="">All</option><option value="listing">About a room advert</option><option value="looking">About a person looking</option><option value="direct">Direct to provider</option></select></AdminFilterField>
          <AdminFilterField label="From"><input className="field" type="date" name="from" defaultValue={query.from} /></AdminFilterField>
          <AdminFilterField label="To"><input className="field" type="date" name="to" defaultValue={query.to} /></AdminFilterField>
        </AdminFilters>
      </div>

      <p className="mt-4 text-[13px] text-ink-soft">Only contact through RoomsNow messages appears here. Calls, external emails and advert views are not counted as contact.</p>
      <div className="mt-3">
        <DataTable compact head={["Person", "Provider", "Advert", "First contact", "Progress", "Latest activity"]}>
          {rows.map(({ conversation, progress, person }) => {
            const requestStatus = conversation.listing && person ? requestStatuses.get(`${conversation.listing.id}:${person.id}`) : undefined;
            return <tr key={conversation.id}>
              <td className="px-4 py-3"><span className="block font-medium">{person ? `${person.firstName} ${person.lastName}` : "Account unavailable"}</span>{person && <span className="block text-[12px] text-ink-faint">{person.email}</span>}</td>
              <td className="px-4 py-3">{companyNames.get(conversation.companyId ?? "") ?? "Provider unavailable"}</td>
              <td className="max-w-[240px] px-4 py-3">{conversation.listing ? <Link className="hover:text-pine-dark hover:underline" href={`/listings/${conversation.listing.id}`}>{conversation.listing.title}</Link> : conversation.lookingForAd ? <Link className="hover:text-pine-dark hover:underline" href={`/people/${conversation.lookingForAd.id}`}>{conversation.lookingForAd.title}</Link> : <span className="text-ink-soft">Direct contact</span>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{exactDate(conversation.createdAt)}</td>
              <td className="px-4 py-3"><span className="block font-medium">{progress.label}</span><span className="block text-[12px] text-ink-faint">{progress.providerStarted ? "Provider started" : "Person started"} · {progress.messageCount} message{progress.messageCount === 1 ? "" : "s"}</span>{requestStatus && <span className="block text-[12px] text-pine-dark">Room request: {PIPELINE_LABELS[requestStatus]}</span>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{timeAgo(conversation.lastMessageAt)}</td>
            </tr>;
          })}
        </DataTable>
        {rows.length === 0 && <p className="rounded-b-card border border-t-0 border-line bg-white px-4 py-6 text-[14px] text-ink-soft">No provider conversations match these filters.</p>}
        <AdminPagination page={page} total={total} query={{ q, provider, kind, from: query.from, to: query.to }} />
      </div>
    </DashboardShell>
  );
}
