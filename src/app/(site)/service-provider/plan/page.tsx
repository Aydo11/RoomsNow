import { DashboardShell } from "@/components/dashboard-shell";
import { SubmitButton } from "@/components/ui";
import { requireServiceBusiness } from "@/server/service-marketplace";
import { buyServiceBoostPackAction, cancelServicePlanAction, openServiceBillingPortalAction, startServicePlanAction } from "@/server/actions/service-business";
import { trialAvailable } from "@/lib/service-billing";
import { billingAvailable, billingIsLive } from "@/lib/billing";
import { SERVICE_PLANS, SERVICE_TRIAL_DAYS, servicePlanFor } from "@/lib/service-marketplace";
import { BOOST_PACKAGES } from "@/lib/boost-packages";
import { SPONSOR_PACKAGES } from "@/lib/sponsor-packages";
import { money, shortDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import { serviceProviderNav } from "../nav";

export const metadata = { title: "Plan and boosts" };
export const dynamic = "force-dynamic";

export default async function ServicePlanPage({ searchParams }: { searchParams: Promise<{ plan?: string; boost_pack?: string }> }) {
  const { plan: result, boost_pack: boostResult } = await searchParams;
  const { user, business } = await requireServiceBusiness();
  const [nav, trial] = await Promise.all([serviceProviderNav(user.id), trialAvailable(business.id)]);
  const current = servicePlanFor(business.subscription);
  const subscription = business.subscription;
  const payments = billingAvailable();
  const onFree = current?.tier === "FREE";

  return (
    <DashboardShell
      title="Plan and boosts"
      subtitle="Your plan decides how many adverts you can run. Every advert is checked by our team before it goes live, and verified businesses show higher in results."
      nav={nav}
      active="/service-provider/plan"
    >
      {result === "complete" && <p className="mb-5 rounded-[10px] bg-pine-light px-4 py-3 text-[14px] text-pine-dark" role="status">Thanks — your plan is set up.</p>}
      {result === "cancelled" && <p className="mb-5 rounded-[10px] bg-paper-sunk px-4 py-3 text-[14px] text-ink-soft" role="status">Checkout cancelled. Nothing was charged.</p>}
      {boostResult === "complete" && <p className="mb-5 rounded-[10px] bg-pine-light px-4 py-3 text-[14px] text-pine-dark" role="status">Boost credits added to your account.</p>}
      {boostResult === "cancelled" && <p className="mb-5 rounded-[10px] bg-paper-sunk px-4 py-3 text-[14px] text-ink-soft" role="status">Boost checkout cancelled. Nothing was charged.</p>}
      {result === "free" && <p className="mb-5 rounded-[10px] bg-pine-light px-4 py-3 text-[14px] text-pine-dark" role="status">You&apos;re on Marketplace Free. You can run up to {SERVICE_PLANS.FREE.maxAdverts} live adverts.</p>}
      {result === "cancel-first" && <p className="mb-5 rounded-[10px] bg-clay-light px-4 py-3 text-[14px] text-clay" role="alert">You&apos;re still on a paid plan. Cancel it below first — you keep it until the end of the period you&apos;ve paid for, then you can choose Free.</p>}
      {result === "too-many" && <p className="mb-5 rounded-[10px] bg-clay-light px-4 py-3 text-[14px] text-clay" role="alert">Free allows {SERVICE_PLANS.FREE.maxAdverts} live adverts. Pause or archive some adverts first, then choose Free.</p>}

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
            {!onFree && !subscription.cancelAtPeriodEnd && (
              <form action={cancelServicePlanAction}><SubmitButton className="btn-ghost text-clay" pendingLabel="Cancelling…">Cancel plan</SubmitButton></form>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {Object.values(SERVICE_PLANS).map((plan) => {
          const isCurrent = current?.tier === plan.tier && !subscription?.cancelAtPeriodEnd;
          const free = plan.tier === "FREE";
          return (
            <section key={plan.tier} className={clsx("card flex flex-col p-6", plan.tier === "PRO" && "border-brand/40 shadow-raise")}>
              <h2 className="text-[20px]">{plan.name}</h2>
              <p className="mt-2">
                <span className="font-display text-[34px]">{free ? "Free" : money(plan.monthly)}</span>
                {!free && <span className="text-[14px] text-ink-soft"> / month</span>}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-[14px] text-ink-soft">
                {plan.features.map((feature) => (
                  <li key={feature} className={clsx("flex gap-2", feature.startsWith("No ") && "text-ink-faint")}>
                    <span aria-hidden="true" className={feature.startsWith("No ") ? "text-ink-faint" : "text-pine"}>{feature.startsWith("No ") ? "–" : "✓"}</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <form action={startServicePlanAction} className="mt-5">
                <input type="hidden" name="tier" value={plan.tier} />
                <SubmitButton
                  className={plan.tier === "PRO" ? "btn-primary w-full" : "btn-secondary w-full"}
                  disabled={isCurrent || (!free && !payments)}
                  pendingLabel={free ? "Switching…" : "Opening checkout…"}
                >
                  {isCurrent
                    ? "Your plan"
                    : free
                      ? current ? "Switch to Free" : "Start free"
                      : current && !onFree
                        ? `Switch to ${plan.tier === "PRO" ? "Pro" : "Standard"}`
                        : trial
                          ? `Start ${SERVICE_TRIAL_DAYS}-day free trial`
                          : `Upgrade to ${plan.tier === "PRO" ? "Pro" : "Standard"}`}
                </SubmitButton>
              </form>
            </section>
          );
        })}
      </div>
      {!payments && <p className="mt-4 text-[14px] text-clay">Payments aren&apos;t switched on yet. Please check back soon.</p>}

      <section id="boosts" className="card mt-6 scroll-mt-24 p-5">
        <h2 className="text-[18px]">Boosts</h2>
        <p className="mt-1 max-w-[65ch] text-[14px] text-ink-soft">
          Each credit gives one live advert a 24-hour clearly labelled boost. Supplier prices now match accommodation adverts, and purchased credits do not expire.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Object.entries(BOOST_PACKAGES).map(([key, pack]) => (
            <form key={key} action={buyServiceBoostPackAction} className="rounded-card border border-line p-4">
              <input type="hidden" name="pack" value={key} />
              <p className="font-semibold">{pack.label}</p><p className="mt-1 text-[20px] font-bold">{money(pack.amount)}</p>
              <SubmitButton className="btn-secondary mt-3 w-full" disabled={!payments} pendingLabel="Opening…">Buy credits</SubmitButton>
            </form>
          ))}
        </div>
        <h3 className="mt-6 text-[17px]">Longer sponsored placements</h3>
        <p className="mt-1 text-[14px] text-ink-soft">Choose a sponsored period from a live advert. Sponsored adverts are always labelled and only appear for relevant searches.</p>
        <ul className="mt-3 flex flex-wrap gap-2 text-[14px]">{Object.values(SPONSOR_PACKAGES).map((pack) => <li key={pack.label} className="chip">{pack.label} · {money(pack.amount)}</li>)}</ul>
      </section>
    </DashboardShell>
  );
}
