import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { billingAvailable, billingIsLive, referrerPlanLimits } from "@/lib/billing";
import { FormSuccess } from "@/components/ui";
import { DashboardShell, DataTable, StatCard } from "@/components/dashboard-shell";
import { ReferrerPlanPicker } from "@/components/referrer-plan-picker";
import { referrerNav } from "../nav";
import { money, shortDate } from "@/lib/format";

export const metadata = { title: "Referrer membership" };
export const dynamic = "force-dynamic";

export default async function ReferrerMembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const user = await requireReferrer();
  const query = await searchParams;
  const billingLive = billingIsLive();
  const paymentsEnabled = billingAvailable();

  // Resolve limits first: it also creates the two referrer catalogue rows when
  // upgrading an older production database that has no seed data yet.
  const limits = await referrerPlanLimits(user.id);
  const [nav, plans, payments] = await Promise.all([
    referrerNav(user.id),
    db.membership.findMany({ where: { audience: "REFERRER" }, orderBy: { priceMonthly: "asc" } }),
    db.referrerPayment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const limit = (value: number) => (value === -1 ? "Unlimited" : value.toString());

  return (
    <DashboardShell
      title="Membership"
      subtitle={
        billingLive
          ? "Referral-agency membership is billed securely through Stripe. Manage payment details, invoices and cancellation here."
          : "Payments will be available after Stripe is configured."
      }
      nav={nav}
      active="/referrals/membership"
    >
      {query.billing === "complete" && (
        <div className="mb-5 animate-fade-in-up">
          <FormSuccess message="Payment completed. Your plan will update as soon as Stripe confirms it." />
        </div>
      )}

      {limits.grant && (
        <div className="mb-5 animate-fade-in-up">
          <FormSuccess
            message={`RoomsNow has granted this account complimentary ${limits.grant.membership.name} access${
              limits.grant.expiresAt ? ` until ${shortDate(limits.grant.expiresAt)}` : ""
            }.`}
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
                : "Granted by RoomsNow"
              : limits.subscription?.currentPeriodEnd
              ? `Renews ${shortDate(limits.subscription.currentPeriodEnd)}`
              : "No renewal date"
          }
        />
        <StatCard label="Active clients" value={`${limits.used.clients} / ${limit(limits.membership.maxClients)}`} />
        <StatCard
          className="col-span-2 sm:col-span-1"
          label="Sharing per client"
          value={limit(limits.membership.maxSharesPerClient)}
          hint="Providers you can share one profile with at once"
        />
      </div>

      <section className="mt-8">
        <h2 className="text-[20px]">Why pay for a referrer plan?</h2>
        <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-ink-soft">
          Free covers up to five active clients so an agency can trial the workflow. Pro costs £19
          per referrer account each month and is for day-to-day referral work: an unlimited caseload,
          unlimited provider sharing and priority routing.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-[20px]">Plans</h2>
        <div className="mt-3">
          <ReferrerPlanPicker
            currentTier={limits.membership.tier}
            cancelling={limits.subscription?.cancelAtPeriodEnd ?? false}
            billingLive={billingLive}
            paymentsEnabled={paymentsEnabled}
            plans={plans.map((plan) => ({
              tier: plan.tier,
              name: plan.name,
              description: plan.description,
              priceMonthly: plan.priceMonthly,
              maxClients: plan.maxClients,
              maxSharesPerClient: plan.maxSharesPerClient,
              priorityRouting: plan.priorityRouting,
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
