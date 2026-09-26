import { DashboardShell } from "@/components/dashboard-shell";
import { SubmitButton } from "@/components/ui";
import { requireServiceBusiness } from "@/server/service-marketplace";
import { cancelServicePlanAction, openServiceBillingPortalAction, startServicePlanAction } from "@/server/actions/service-business";
import { trialAvailable } from "@/lib/service-billing";
import { billingAvailable, billingIsLive } from "@/lib/billing";
import { SERVICE_BOOSTS, SERVICE_PLANS, SERVICE_TRIAL_DAYS, servicePlanFor } from "@/lib/service-marketplace";
import { money, shortDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import { serviceProviderNav } from "../nav";

export const metadata = { title: "Plan and boosts" };
export const dynamic = "force-dynamic";

export default async function ServicePlanPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan: result } = await searchParams;
  const { user, business } = await requireServiceBusiness();
  const [nav, trial] = await Promise.all([serviceProviderNav(user.id), trialAvailable(business.id)]);
  const current = servicePlanFor(business.subscription);
  const subscription = business.subscription;
  const payments = billingAvailable();

  return (
    <DashboardShell
      title="Plan and boosts"
      subtitle="Your plan decides how many adverts you can run. Adverts only show once your business is verified — you're never charged for visibility you can't get."
      nav={nav}
      active="/service-provider/plan"
    >
      {result === "complete" && <p className="mb-5 rounded-[10px] bg-pine-light px-4 py-3 text-[14px] text-pine-dark" role="status">Thanks — your plan is set up.</p>}
      {result === "cancelled" && <p className="mb-5 rounded-[10px] bg-paper-sunk px-4 py-3 text-[14px] text-ink-soft" role="status">Checkout cancelled. Nothing was charged.</p>}

      {current && subscription && (
        <section className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-[13px] text-ink-faint">Current plan</p>
            <p className="font-display text-[22px]">{current.name}</p>
            <p className="text-[13px] text-ink-soft">
              {subscription.status === "TRIALING" && subscription.trialEndsAt ? `Free trial until ${shortDate(subscription.trialEndsAt)}. ` : ""}
              {subscription.status === "PAST_DUE" ? "Your last payment failed — update your card to keep your adverts live. " : ""}
              {subscription.cancelAtPeriodEnd ? `Ends ${shortDate(subscription.currentPeriodEnd ?? subscription.trialEndsAt)}.` : subscription.currentPeriodEnd ? `Renews ${shortDate(subscription.currentPeriodEnd)}.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {billingIsLive() && subscription.externalCustomerId && (
              <form action={openServiceBillingPortalAction}><SubmitButton className="btn-secondary" pendingLabel="Opening…">Billing and invoices</SubmitButton></form>
            )}
            {!subscription.cancelAtPeriodEnd && (
              <form action={cancelServicePlanAction}><SubmitButton className="btn-ghost text-clay" pendingLabel="Cancelling…">Cancel plan</SubmitButton></form>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {Object.values(SERVICE_PLANS).map((plan) => {
          const isCurrent = current?.tier === plan.tier && !subscription?.cancelAtPeriodEnd;
          return (
            <section key={plan.tier} className={clsx("card flex flex-col p-6", plan.tier === "PRO" && "border-brand/40 shadow-raise")}>
              <h2 className="text-[20px]">{plan.name}</h2>
              <p className="mt-2"><span className="font-display text-[34px]">{money(plan.monthly)}</span><span className="text-[14px] text-ink-soft"> / month</span></p>
              <ul className="mt-4 flex-1 space-y-2 text-[14px] text-ink-soft">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2"><span aria-hidden="true" className="text-pine">✓</span>{feature}</li>
                ))}
              </ul>
              <form action={startServicePlanAction} className="mt-5">
                <input type="hidden" name="tier" value={plan.tier} />
                <SubmitButton className={plan.tier === "PRO" ? "btn-primary w-full" : "btn-secondary w-full"} disabled={isCurrent || !payments} pendingLabel="Opening checkout…">
                  {isCurrent ? "Your plan" : current ? `Switch to ${plan.tier === "PRO" ? "Pro" : "Standard"}` : trial ? `Start ${SERVICE_TRIAL_DAYS}-day free trial` : "Choose plan"}
                </SubmitButton>
              </form>
            </section>
          );
        })}
      </div>
      {!payments && <p className="mt-4 text-[14px] text-clay">Payments aren&apos;t switched on yet. Please check back soon.</p>}

      <section className="card mt-6 p-5">
        <h2 className="text-[18px]">Boosts</h2>
        <p className="mt-1 max-w-[65ch] text-[14px] text-ink-soft">
          Put a live advert above matching results, clearly labelled as boosted. Boosts only show when a provider searches your category or area. Buy them from any live
          advert.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-[14px]">
          {Object.values(SERVICE_BOOSTS).map((pack) => <li key={pack.key} className="chip">{pack.days} days · {money(pack.amount)}</li>)}
        </ul>
      </section>
    </DashboardShell>
  );
}
