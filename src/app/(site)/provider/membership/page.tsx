import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { billingAvailable, billingIsLive, planLimits } from "@/lib/billing";
import { FormSuccess } from "@/components/ui";
import { DashboardShell, DataTable, StatCard } from "@/components/dashboard-shell";
import { PlanPicker } from "@/components/plan-picker";
import { providerNav } from "../nav";
import { money, shortDate } from "@/lib/format";

export const metadata = { title: "Membership" };
export const dynamic = "force-dynamic";

export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const { companyId } = await requireCompany();
  const query = await searchParams;
  const billingLive = billingIsLive();
  const paymentsEnabled = billingAvailable();
  const [nav, limits, plans, payments] = await Promise.all([
    providerNav(companyId),
    planLimits(companyId),
    db.membership.findMany({
      where: { audience: "PROVIDER" },
      orderBy: { priceMonthly: "asc" },
    }),
    db.payment.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const limit = (value: number) => (value === -1 ? "Unlimited" : value.toString());

  return (
    <DashboardShell
      title="Membership"
      subtitle={billingLive ? "Upgrade securely with Stripe. You can manage payment details and cancellation here." : "Payments will be available after Stripe is configured."}
      nav={nav}
      active="/provider/membership"
    >
      {query.billing === "complete" && <div className="mb-5"><FormSuccess message="Payment completed. Your membership will update as soon as Stripe confirms it." /></div>}
      {limits.grant && (
        <div className="mb-5">
          <FormSuccess
            message={`RoomsNow has granted your organisation complimentary ${limits.grant.membership.name} access${
              limits.grant.expiresAt ? ` until ${shortDate(limits.grant.expiresAt)}` : ""
            }. Your billing history remains separate.`}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Current plan"
          value={limits.membership.name}
          hint={
            limits.source === "ADMIN_GRANT"
              ? limits.grant?.expiresAt
                ? `Admin access ends ${shortDate(limits.grant.expiresAt)}`
                : "Complimentary admin access"
              : limits.subscription?.currentPeriodEnd
              ? `Renews ${shortDate(limits.subscription.currentPeriodEnd)}`
              : "No renewal date"
          }
        />
        <StatCard
          label="Adverts"
          value={`${limits.used.listings} / ${limit(limits.membership.maxListings)}`}
        />
        <StatCard className="col-span-2 sm:col-span-1" label="Rooms" value={`${limits.used.rooms} / ${limit(limits.membership.maxRooms)}`} />
      </div>

      <section className="mt-8">
        <h2 className="text-[20px]">Plans</h2>
        <div className="mt-3">
          <PlanPicker
            currentTier={limits.membership.tier}
            paidTier={
              limits.subscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(limits.subscription.status)
                ? limits.subscription.membership.tier
                : null
            }
            cancelling={limits.subscription?.cancelAtPeriodEnd ?? false}
            billingLive={billingLive}
            paymentsEnabled={paymentsEnabled}
            plans={plans.map((plan) => ({
              tier: plan.tier,
              name: plan.name,
              description: plan.description,
              priceMonthly: plan.priceMonthly,
              maxListings: plan.maxListings,
              maxRooms: plan.maxRooms,
              maxStaff: plan.maxStaff,
              featuredCredits: plan.featuredCredits,
              includedBoosts: plan.includedBoosts,
              analytics: plan.analytics,
              priorityPlacement: plan.priorityPlacement,
            }))}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[20px]">Billing history</h2>
        <div className="mt-3">
          {payments.length === 0 ? (
            <p className="card p-5 text-[15px] text-ink-soft">Nothing billed yet.</p>
          ) : (
            <DataTable head={["Date", "Description", "Amount", "Status"]}>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3">{shortDate(payment.createdAt)}</td>
                  <td className="px-4 py-3">{payment.description ?? payment.kind.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{money(payment.amount)}</td>
                  <td className="px-4 py-3 capitalize text-ink-soft">{payment.status.toLowerCase()}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
