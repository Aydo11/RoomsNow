import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell, DataTable, StatCard } from "@/components/dashboard-shell";
import { adminNav } from "../nav";
import { money, shortDate } from "@/lib/format";
import { AdminMembershipGrantForm } from "@/components/admin-membership-grant-form";
import { AdminUserMembershipGrantForm } from "@/components/admin-user-membership-grant-form";
import { ensureReferrerMembershipCatalogue, ensureProviderMembershipCatalogue } from "@/lib/billing";

export const metadata = { title: "Memberships" };
export const dynamic = "force-dynamic";

export default async function AdminMembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 100);
  const now = new Date();
  await ensureReferrerMembershipCatalogue();
  await ensureProviderMembershipCatalogue();
  const [nav, plans, subscriptions, referrerSubscriptions, providers, referrers, payments, revenue] = await Promise.all([
    adminNav(),
    db.membership.findMany({ where: { audience: "PROVIDER" }, orderBy: { priceMonthly: "asc" } }),
    db.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { company: { select: { name: true } }, membership: { select: { name: true } } },
    }),
    db.referrerSubscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { firstName: true, lastName: true, email: true } }, membership: { select: { name: true } } },
    }),
    db.company.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { tradingName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
      take: q ? 250 : 100,
      select: {
        id: true,
        name: true,
        subscription: {
          select: { status: true, membership: { select: { name: true, tier: true } } },
        },
        membershipGrants: {
          where: {
            revokedAt: null,
            startsAt: { lte: now },
            membership: { audience: "PROVIDER", tier: { in: ["PROFESSIONAL", "BUSINESS"] } },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { expiresAt: true, membership: { select: { name: true, tier: true } } },
        },
      },
    }),
    db.user.findMany({
      where: {
        role: "REFERRER",
        status: "ACTIVE",
        deletedAt: null,
        ...(q ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: q ? 250 : 100,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        referrerSubscription: { select: { status: true, membership: { select: { name: true } } } },
        userMembershipGrants: {
          where: {
            revokedAt: null,
            startsAt: { lte: now },
            membership: { audience: "REFERRER", tier: "REFERRER_PRO" },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { expiresAt: true, membership: { select: { name: true } } },
        },
      },
    }),
    db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { company: { select: { name: true } } } }),
    db.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);

  return (
    <DashboardShell
      title="Memberships"
      subtitle="Manage complimentary provider and referrer access, and review paid subscriptions confirmed through Stripe."
      nav={nav}
      active="/admin/memberships"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active subscriptions" value={subscriptions.filter((s) => s.status === "ACTIVE").length + referrerSubscriptions.filter((s) => s.status === "ACTIVE").length} />
        <StatCard label="Plans" value={plans.length} />
        <StatCard label="Collected" value={money(revenue._sum.amount ?? 0)} />
      </div>

      <section className="mt-8">
        <h2 className="text-[20px]">Provider access</h2>
        <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">
          Grant Professional or Business access without recording a payment. Paid Stripe subscriptions continue separately and still activate automatically after payment.
        </p>
        <form className="mt-4 flex max-w-xl gap-2" method="get">
          <label className="sr-only" htmlFor="provider-search">Find a provider</label>
          <input
            id="provider-search"
            className="field"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search provider name or email"
          />
          <button className="btn-secondary" type="submit">Search</button>
        </form>
        <div className="mt-3">
          <DataTable head={["Provider", "Paid plan", "Admin grant", ""]}>
            {providers.map((provider) => {
              const paid = provider.subscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(provider.subscription.status)
                ? provider.subscription.membership.name
                : "Free";
              const grant = provider.membershipGrants[0];
              const expiresOn = grant?.expiresAt ? grant.expiresAt.toISOString().slice(0, 10) : null;
              return (
                <tr key={provider.id}>
                  <td className="px-4 py-3 font-medium">{provider.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{paid}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {grant ? `${grant.membership.name}${grant.expiresAt ? ` · ends ${shortDate(grant.expiresAt)}` : " · no expiry"}` : "—"}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <AdminMembershipGrantForm
                      companyId={provider.id}
                      currentGrant={grant ? {
                        tier: grant.membership.tier as "PROFESSIONAL" | "BUSINESS",
                        name: grant.membership.name,
                        expiresOn,
                      } : null}
                    />
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[20px]">Individual referrer access</h2>
        <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">
          Grant Pro features to one professional referrer account. Provider plans remain attached to their organisation so every authorised team member receives the same limits.
        </p>
        <div className="mt-3">
          <DataTable head={["Referrer", "Paid plan", "Admin grant", ""]}>
            {referrers.map((referrer) => {
              const paid = referrer.referrerSubscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(referrer.referrerSubscription.status)
                ? referrer.referrerSubscription.membership.name
                : "Free";
              const grant = referrer.userMembershipGrants[0];
              const expiresOn = grant?.expiresAt ? grant.expiresAt.toISOString().slice(0, 10) : null;
              return (
                <tr key={referrer.id}>
                  <td className="px-4 py-3">
                    <span className="block font-medium">{referrer.firstName} {referrer.lastName}</span>
                    <span className="block text-[12px] text-ink-faint">{referrer.email}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{paid}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {grant ? `${grant.membership.name}${grant.expiresAt ? ` · ends ${shortDate(grant.expiresAt)}` : " · no expiry"}` : "—"}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <AdminUserMembershipGrantForm
                      userId={referrer.id}
                      currentGrant={grant ? { name: grant.membership.name, expiresOn } : null}
                    />
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[20px]">Plans</h2>
        <div className="mt-3">
          <DataTable head={["Plan", "Price", "Adverts", "Rooms", "Promoted slots", "Analytics"]}>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-4 py-3">{plan.name}</td>
                <td className="px-4 py-3">{plan.priceMonthly === 0 ? "Free" : `${money(plan.priceMonthly)} / month`}</td>
                <td className="px-4 py-3">{plan.maxListings === -1 ? "Unlimited" : plan.maxListings}</td>
                <td className="px-4 py-3">{plan.maxRooms === -1 ? "Unlimited" : plan.maxRooms}</td>
                <td className="px-4 py-3">{plan.featuredCredits}</td>
                <td className="px-4 py-3">{plan.analytics ? "Yes" : "No"}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[20px]">Subscriptions</h2>
        <div className="mt-3">
          <DataTable head={["Provider", "Plan", "Status", "Renews"]}>
            {subscriptions.map((subscription) => (
              <tr key={subscription.id}>
                <td className="px-4 py-3">{subscription.company.name}</td>
                <td className="px-4 py-3">{subscription.membership.name}</td>
                <td className="px-4 py-3 capitalize text-ink-soft">
                  {subscription.status.toLowerCase()}
                  {subscription.cancelAtPeriodEnd ? " (ending)" : ""}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {subscription.currentPeriodEnd ? shortDate(subscription.currentPeriodEnd) : "—"}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      </section>

      {referrerSubscriptions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[20px]">Referrer subscriptions</h2>
          <div className="mt-3">
            <DataTable head={["Referrer", "Plan", "Status", "Renews"]}>
              {referrerSubscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td className="px-4 py-3">
                    {subscription.user.firstName} {subscription.user.lastName}
                    <span className="block text-[12px] text-ink-faint">{subscription.user.email}</span>
                  </td>
                  <td className="px-4 py-3">{subscription.membership.name}</td>
                  <td className="px-4 py-3 capitalize text-ink-soft">{subscription.status.toLowerCase()}</td>
                  <td className="px-4 py-3 text-ink-soft">{subscription.currentPeriodEnd ? shortDate(subscription.currentPeriodEnd) : "—"}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-[20px]">Payments</h2>
        <div className="mt-3">
          <DataTable head={["Date", "Provider", "Description", "Amount", "Status"]}>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-4 py-3">{shortDate(payment.createdAt)}</td>
                <td className="px-4 py-3">{payment.company.name}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {payment.description ?? payment.kind.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3">{money(payment.amount)}</td>
                <td className="px-4 py-3 capitalize text-ink-soft">{payment.status.toLowerCase()}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </section>
    </DashboardShell>
  );
}
