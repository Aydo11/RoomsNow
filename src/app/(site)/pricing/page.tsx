import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { brand } from "@/brand.config";
import { billingIsLive } from "@/lib/billing";
import { getCurrentUser } from "@/lib/session";
import { PricingTabs } from "@/components/pricing-tabs";
import { SponsorDurationPicker } from "@/components/sponsor-duration-picker";

export const metadata = { title: "Membership and pricing" };
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const [plans, referrerPlans, user] = await Promise.all([
    db.membership.findMany({ where: { active: true, audience: "PROVIDER" }, orderBy: { priceMonthly: "asc" } }),
    db.membership.findMany({ where: { active: true, audience: "REFERRER" }, orderBy: { priceMonthly: "asc" } }),
    getCurrentUser(),
  ]);
  const livePayments = billingIsLive();
  const provider = user?.role === "PROVIDER";
  const referrer = user?.role === "REFERRER";

  return (
    <div className="shell py-14">
      <h1 className="max-w-[22ch] text-[38px] leading-tight">Membership and pricing</h1>
      <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
        People looking for accommodation always use {brand.name} free. Providers pay to advertise,
        and professional referrers can upgrade for a bigger caseload and unlimited sharing.{" "}
        {livePayments ? "Payments are handled securely by Stripe." : "Online payments are being configured."}
      </p>

      <div className="mt-8">
        <PricingTabs
          providerPanel={
            <div className="grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
          <div
            key={plan.id}
            className={plan.tier === "PROFESSIONAL" ? "rounded-card border-2 border-pine bg-white p-7" : "card p-7"}
          >
            {plan.tier === "PROFESSIONAL" && (
              <span className="chip chip-active mb-3">Most providers start here</span>
            )}
            <h2 className="text-[24px]">{plan.name}</h2>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-[34px]">{plan.priceMonthly === 0 ? "Free" : money(plan.priceMonthly)}</span>
              {plan.priceMonthly > 0 && <span className="text-[15px] text-ink-soft">per month</span>}
            </p>
            {plan.description && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{plan.description}</p>}

            <ul className="mt-5 space-y-2.5 text-[15px]">
              <Feature>{plan.maxListings === -1 ? "Unlimited adverts" : `${plan.maxListings} live advert${plan.maxListings === 1 ? "" : "s"}`}</Feature>
              <Feature>{plan.maxRooms === -1 ? "Unlimited rooms" : `Up to ${plan.maxRooms} rooms`}</Feature>
              <Feature>{plan.maxStaff === -1 ? "Unlimited staff accounts" : plan.maxStaff === 1 ? "Single user" : `${plan.maxStaff} staff accounts`}</Feature>
              <Feature enabled={plan.videoUploads}>Video uploads</Feature>
              <Feature enabled={plan.analytics}>Advert analytics</Feature>
              <Feature enabled={plan.priorityPlacement}>Priority placement in search</Feature>
              <Feature enabled={plan.featuredCredits > 0}>
                {plan.featuredCredits > 0
                  ? `${plan.featuredCredits} free 7-day promoted slot${plan.featuredCredits === 1 ? "" : "s"} at a time`
                  : "Promoted slots"}
              </Feature>
              <Feature enabled={plan.prioritySupport}>Priority support</Feature>
            </ul>

            <Link
              href={provider ? "/provider/membership" : `/register?type=PROVIDER&plan=${plan.tier}`}
              className={plan.tier === "PROFESSIONAL" ? "btn-primary mt-7 w-full" : "btn-secondary mt-7 w-full"}
            >
              {plan.priceMonthly === 0 ? "Start free" : `Choose ${plan.name}`}
            </Link>
                </div>
              ))}
            </div>
          }
          referrerPanel={
            <div>
              <div className="grid gap-5 lg:grid-cols-2">
                {referrerPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={plan.tier === "REFERRER_PRO" ? "rounded-card border-2 border-pine bg-white p-7" : "card p-7"}
                  >
                    {plan.tier === "REFERRER_PRO" && (
                      <span className="chip chip-active mb-3">For a real referral stream</span>
                    )}
                    <h2 className="text-[24px]">{plan.name}</h2>
                    <p className="mt-2 flex items-baseline gap-1.5">
                      <span className="font-display text-[34px]">{plan.priceMonthly === 0 ? "Free" : money(plan.priceMonthly)}</span>
                      {plan.priceMonthly > 0 && <span className="text-[15px] text-ink-soft">per month</span>}
                    </p>
                    {plan.description && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{plan.description}</p>}

                    <ul className="mt-5 space-y-2.5 text-[15px]">
                      <Feature>{plan.maxClients === -1 ? "Unlimited active clients" : `${plan.maxClients} active client${plan.maxClients === 1 ? "" : "s"}`}</Feature>
                      <Feature>
                        {plan.maxSharesPerClient === -1
                          ? "Share each profile with unlimited providers"
                          : `Share each profile with ${plan.maxSharesPerClient} provider${plan.maxSharesPerClient === 1 ? "" : "s"} at once`}
                      </Feature>
                      <Feature enabled={plan.priorityRouting}>Priority routing badge on referrals</Feature>
                      <Feature>Secure subscription checkout</Feature>
                      <Feature>Payment history and invoices</Feature>
                      <Feature>Manage payment details and cancellation</Feature>
                    </ul>

                    <Link
                      href={referrer ? "/referrals/membership" : `/register?type=REFERRER&plan=${plan.tier}`}
                      className={plan.tier === "REFERRER_PRO" ? "btn-primary mt-7 w-full" : "btn-secondary mt-7 w-full"}
                    >
                      {plan.priceMonthly === 0 ? "Start free" : `Choose ${plan.name}`}
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-card border border-line bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-dark">Referral agency membership</p>
                    <h2 className="mt-1 text-[20px]">A simple launch price for professional teams</h2>
                  </div>
                  <span className="rounded-pill bg-pine-light px-3 py-1.5 text-[13px] font-medium text-pine-dark">Â£19 per referrer account / month</span>
                </div>
                <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">
                  Save the people you support once as clients, then refer them to a live advert or
                  share their profile with any provider â no re-typing the same details into a new
                  form each time. Pro removes the caseload limit and lets you share one profile with
                  as many providers as you're approaching at once, which matters when you're placing
                  someone urgently.
                </p>
                <p className="mt-3 text-[13px] text-ink-faint">People seeking accommodation never pay. Each professional referrer account manages its own caseload and billing.</p>
              </div>
            </div>
          }
        />
      </div>

      <section id="sponsored" className="mt-12 overflow-hidden rounded-card border border-line bg-white shadow-[0_1px_2px_rgba(21,42,58,.03)]">
        <div className="grid gap-6 border-b border-line bg-paper-sunk/60 p-6 lg:grid-cols-[1.1fr_.9fr] lg:p-8">
          <div>
            <span className="chip border-clay/30 bg-clay-light text-clay-dark">Optional paid promotion</span>
            <h2 className="mt-3 text-[26px]">Sponsored adverts</h2>
            <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
              Put a live vacancy in up to three clearly labelled positions at the top of relevant first-page searches, with a highlighted map pin.
            </p>
          </div>
          <ul className="flex flex-col gap-2.5 text-[14px] text-ink-soft">
            <Feature>Only shown when the advert matches the person&apos;s filters</Feature>
            <Feature>Always labelled Sponsored, including on the map</Feature>
            <Feature>Does not affect verification, moderation or organic ranking</Feature>
          </ul>
        </div>
        <div className="p-6 lg:p-8">
          <SponsorDurationPicker provider={provider} livePayments={livePayments} />
        </div>
      </section>
    </div>
  );
}

function Feature({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  return (
    <li className={`flex items-start gap-2.5 ${enabled ? "" : "text-ink-faint line-through"}`}>
      <svg viewBox="0 0 16 16" className={`mt-1 h-3.5 w-3.5 shrink-0 ${enabled ? "text-pine" : "text-line-strong"}`} fill="currentColor">
        <path d="M6.2 11.6 2.6 8l1-1 2.6 2.6L12.4 3.4l1 1-7.2 7.2Z" />
      </svg>
      {children}
    </li>
  );
}
