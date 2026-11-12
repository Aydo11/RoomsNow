import { WHATSAPP_ADDON_LABEL, whatsappPlanLine } from "@/lib/whatsapp-access";
import { ProServicesNudge } from "@/components/membership-tabs";
import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { planWasPrice } from "@/lib/plan-offer";
import { brand } from "@/brand.config";
import { billingIsLive, ensureProviderMembershipCatalogue } from "@/lib/billing";
import { getCurrentUser } from "@/lib/session";
import { PricingTabs, type PricingTab } from "@/components/pricing-tabs";
import { SERVICE_PLANS, SERVICE_TRIAL_DAYS } from "@/lib/service-marketplace";
import { SponsorDurationPicker } from "@/components/sponsor-duration-picker";
import { BOOST_PACKAGES } from "@/lib/boost-packages";
import { pageMetadata } from "@/lib/seo";
import { PlanDemo } from "@/components/plan-demo";
import { PlanShowcase } from "@/components/plan-showcase";
import { PLAN_GUIDES, PLAN_GUIDE_KEYS, planPdfPath, saleLines, type PlanGuideKey } from "@/lib/plan-guides";
import { SPONSOR_PACKAGES } from "@/lib/sponsor-packages";

export const metadata = pageMetadata({
  title: "Membership & Pricing for Accommodation Providers | RoomsNow",
  description: "Membership plans for accommodation providers, referral agencies and trades advertising on Provider Services, plus boosts and sponsored placements. Free for people looking for a room.",
  path: "/pricing",
});
export const dynamic = "force-dynamic";

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab: PricingTab = tab === "referrer" || tab === "services" ? tab : "provider";
  await ensureProviderMembershipCatalogue();
  const [plans, referrerPlans, user] = await Promise.all([
    db.membership.findMany({ where: { active: true, audience: "PROVIDER" }, orderBy: { priceMonthly: "asc" } }),
    db.membership.findMany({ where: { active: true, audience: "REFERRER" }, orderBy: { priceMonthly: "asc" } }),
    getCurrentUser(),
  ]);
  const livePayments = billingIsLive();
  // Anyone who runs a provider company (including an admin who also owns one) buys boosts and sponsorship.
  const provider = user?.role === "PROVIDER" || Boolean(user?.staffOf?.length);
  const signedIn = Boolean(user);
  const referrer = user?.role === "REFERRER";
  const serviceBusiness = user?.role === "SERVICE_PROVIDER";
  const prices = Object.fromEntries([...plans, ...referrerPlans].map((p) => [p.tier, p.priceMonthly]));
  const sale = saleLines(prices);

  return (
    <div className="shell py-10 sm:py-14">
      <section className="relative overflow-hidden rounded-[28px] bg-[#171F2E] px-6 py-10 text-white sm:px-10 sm:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(#549DE533 1.5px, transparent 1.5px)", backgroundSize: "30px 30px" }} />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full bg-[#1666AA]/40 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[#9CC9F2]!">Membership and pricing</p>
            <h1 className="mt-2 max-w-[20ch] font-display text-[34px] leading-[1.08] text-white! [text-wrap:balance] sm:text-[46px]">Fill rooms faster, with a plan that fits your portfolio</h1>
            <p className="mt-4 max-w-[58ch] text-[16.5px] leading-relaxed text-white/80!">
              People looking for accommodation always use {brand.name} free. Providers pay to advertise and promote,
              referral agencies can upgrade for a bigger caseload, and trades can advertise to providers.
              Watch a short demo of every plan and extra below.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <a href="#see-it" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-bold text-[#0F4F87] transition hover:scale-[1.03]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg> Watch the demos
              </a>
              <a href={planPdfPath("ALL")} target="_blank" rel="noopener" className="inline-flex items-center rounded-full bg-white/10 px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-white/20">Download the pricing guide (PDF)</a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-white/75!">
              <li>✓ Free for people looking for a room</li>
              <li>✓ Monthly plans, cancel any time</li>
              <li>✓ {livePayments ? "Secure card payments by Stripe" : "Online payments being configured"}</li>
            </ul>
          </div>
          <div className="min-w-0 rounded-[20px] bg-white/5 p-2 ring-1 ring-white/10">
            <PlanDemo kind="BOOST" autoPlay loop />
            <p className="px-2 pb-1 pt-2.5 text-[13px] text-white/70!">A boost puts your advert at the top of search for 24 hours. <a href="#boosts" className="font-semibold text-white! underline">How boosts work</a></p>
          </div>
        </div>
      </section>

      {sale.length > 0 && (
        <section aria-labelledby="sale-heading" className="mt-6 rounded-card border-2 border-dashed border-clay/50 bg-clay/5 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-block rounded-pill bg-clay px-3 py-1 text-[12px] font-bold uppercase tracking-[0.06em] text-white">Limited-time offer</span>
              <h2 id="sale-heading" className="mt-2 text-[24px] [text-wrap:balance]">Up to {Math.max(...sale.map((s) => s.percent))}% off Professional and Business</h2>
              <p className="mt-1.5 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-soft">
                Join a paid plan while the offer is on and you pay the offer price shown at checkout, every month. No setup fee, no contract, and you can cancel from your Membership page whenever you like.
              </p>
            </div>
            <a href={planPdfPath("ALL")} target="_blank" rel="noopener" className="btn-secondary shrink-0">Offer details (PDF)</a>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {sale.map((s) => (
              <div key={s.tier} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-white p-4 ring-1 ring-line">
                <div>
                  <p className="text-[15px] font-semibold">{s.name}</p>
                  <p className="mt-0.5 flex items-baseline gap-2">
                    <s className="text-[16px] text-ink-faint decoration-clay decoration-2">{money(s.was)}</s>
                    <span className="font-display text-[28px] leading-none">{money(s.now)}</span>
                    <span className="text-[13px] text-ink-soft">a month</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="rounded-pill bg-clay/10 px-2.5 py-0.5 text-[13px] font-bold text-clay">Save {s.percent}%</p>
                  <p className="mt-1 text-[12.5px] text-ink-soft">{money(s.monthly)} a month · {money(s.yearly)} a year</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <PricingTabs
          initialTab={initialTab}
          servicesPanel={
            <div>
              <div className="grid gap-5 lg:grid-cols-3">
                {Object.values(SERVICE_PLANS).map((plan) => (
                  <div
                    key={plan.tier}
                    data-spotlight
                    className={plan.tier === "PRO" ? "rounded-card border-2 border-pine bg-white p-7 shadow-raise transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-float" : "card interactive-card p-7"}
                  >
                    {plan.tier === "PRO" && <span className="chip chip-active mb-3">Priority placement</span>}
                    <h2 className="text-[24px]">{plan.name}</h2>
                    <p className="mt-2 flex items-baseline gap-1.5">
                      <span className="font-display text-[34px]">{plan.monthly === 0 ? "Free" : money(plan.monthly)}</span>
                      {plan.monthly > 0 && <span className="text-[15px] text-ink-soft">per month</span>}
                    </p>
                    <p className="mt-1 text-[14px] text-pine-dark">
                      {plan.monthly === 0 ? "No card needed. Upgrade any time." : `${SERVICE_TRIAL_DAYS}-day free trial for new businesses`}
                    </p>

                    <ul className="mt-5 space-y-2.5 text-[15px]">
                      {plan.features.map((feature) => <Feature key={feature} enabled={!feature.startsWith("No ")}>{feature}</Feature>)}
                      {plan.monthly > 0 && <Feature>Secure subscription checkout, invoices and cancellation</Feature>}
                    </ul>

                    <Link
                      href={serviceBusiness ? "/service-provider/plan" : "/register?type=SERVICE_PROVIDER"}
                      className={plan.tier === "PRO" ? "btn-primary mt-7 w-full" : "btn-secondary mt-7 w-full"}
                    >
                      {serviceBusiness ? `Choose ${plan.name}` : plan.monthly === 0 ? "Start free" : `Start ${SERVICE_TRIAL_DAYS}-day free trial`}
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-card border border-line bg-white p-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-dark">Provider Services</p>
                <h2 className="mt-1 text-[20px]">Advertise to the providers who need your trade</h2>
                <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">
                  Gas and electrical safety, void cleans, repairs, furniture packs and more. Your adverts appear in
                  Provider Services, where paying accommodation providers message you and send quote requests.
                  Every business is checked before its adverts go live.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4">
                  <Link href="/advertise-services" className="btn-ghost px-0">How Provider Services works →</Link>
                  <GuideLinks guide="SERVICES" />
                </div>
              </div>
            </div>
          }
          providerPanel={
            <div className="grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
          <div
            key={plan.id}
            id={guideFor(plan.tier) ? PLAN_GUIDES[guideFor(plan.tier)!].slug : undefined}
            data-spotlight
            className={plan.tier === "PROFESSIONAL" ? "rounded-card border-2 border-pine bg-white p-7 shadow-raise transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-float" : "card interactive-card p-7"}
          >
            {plan.tier === "PROFESSIONAL" && (
              <span className="chip chip-active mb-3">Most providers start here</span>
            )}
            <h2 className="text-[24px]">{plan.name}</h2>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {planWasPrice(plan.tier, plan.priceMonthly) && (
                <s className="text-[20px] text-ink-faint decoration-clay decoration-2" aria-label={`Was ${money(planWasPrice(plan.tier, plan.priceMonthly))}`}>{money(planWasPrice(plan.tier, plan.priceMonthly))}</s>
              )}
              <span className="font-display text-[34px]">{plan.priceMonthly === 0 ? "Free" : money(plan.priceMonthly)}</span>
              {plan.priceMonthly > 0 && <span className="text-[15px] text-ink-soft">per month</span>}
            </p>
            {planWasPrice(plan.tier, plan.priceMonthly) && (
              <p className="mt-1.5 inline-block rounded-full bg-clay/10 px-2.5 py-0.5 text-[12.5px] font-semibold text-clay">
                Limited-time offer · save {money((planWasPrice(plan.tier, plan.priceMonthly) ?? 0) - plan.priceMonthly)} a month
              </p>
            )}
            {plan.description && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{plan.description}</p>}

            <ul className="mt-5 space-y-2.5 text-[15px]">
              <Feature>{plan.maxListings === -1 ? "Unlimited adverts" : `${plan.maxListings} live advert${plan.maxListings === 1 ? "" : "s"}`}</Feature>
              <Feature>{plan.maxRooms === -1 ? "Unlimited rooms" : `Up to ${plan.maxRooms} rooms`}</Feature>
              <Feature>{plan.maxStaff === -1 ? "Unlimited staff accounts" : plan.maxStaff === 1 ? "Single user" : `${plan.maxStaff} staff accounts`}</Feature>
              <Feature enabled={plan.videoUploads}>Video uploads</Feature>
              <Feature enabled={plan.tier !== "FREE"}>{plan.tier === "FREE" ? "24-hour stories" : plan.videoUploads ? "24-hour photo and video stories on search" : "24-hour photo stories on search"}</Feature>
              <Feature enabled={plan.analytics}>Advert analytics</Feature>
              <Feature enabled={plan.priorityPlacement}>Priority placement in search</Feature>
              <Feature enabled={plan.featuredCredits > 0}>
                {plan.featuredCredits > 0
                  ? `${plan.featuredCredits} free 7-day promoted slot${plan.featuredCredits === 1 ? "" : "s"} at a time`
                  : "Promoted slots"}
              </Feature>
              <Feature enabled={plan.includedBoosts > 0}>
                {plan.includedBoosts > 0
                  ? `${plan.includedBoosts} included 24-hour boost${plan.includedBoosts === 1 ? "" : "s"} per billing period`
                  : "Included 24-hour boosts"}
              </Feature>
              <Feature enabled={plan.prioritySupport}>Priority support</Feature>
              <Feature enabled={whatsappPlanLine(plan.tier).enabled}>{whatsappPlanLine(plan.tier).text}</Feature>
            </ul>

            <Link
              href={provider ? "/provider/membership" : `/register?type=PROVIDER&plan=${plan.tier}`}
              className={plan.tier === "PROFESSIONAL" ? "btn-primary mt-7 w-full" : "btn-secondary mt-7 w-full"}
            >
              {plan.priceMonthly === 0 ? "Start free" : `Choose ${plan.name}`}
            </Link>
            <GuideLinks guide={guideFor(plan.tier)} />
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
                    data-spotlight
                    className={plan.tier === "REFERRER_PRO" ? "rounded-card border-2 border-pine bg-white p-7 shadow-raise transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-float" : "card interactive-card p-7"}
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
                    {plan.tier === "REFERRER_PRO" && <GuideLinks guide="REFERRER_PRO" />}
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-card border border-line bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-dark">Referral agency membership</p>
                    <h2 className="mt-1 text-[20px]">A simple launch price for professional teams</h2>
                  </div>
                  <span className="rounded-pill bg-pine-light px-3 py-1.5 text-[13px] font-medium text-pine-dark">£19 per referrer account / month</span>
                </div>
                <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">
                  Save the people you support once as clients, then refer them to a live advert or
                  share their profile with any provider — no re-typing the same details into a new
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

      <section aria-labelledby="compare-heading" className="mt-12">
        <h2 id="compare-heading" className="text-[26px]">Provider plans side by side</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-soft">Everything each plan includes, so you can see exactly what you get for the money.</p>
        <div className="mt-5 overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full min-w-[620px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-line bg-paper-sunk/60">
                <th scope="col" className="px-4 py-3 font-semibold text-ink-soft">What you get</th>
                {plans.map((p) => (
                  <th key={p.id} scope="col" className={`px-4 py-3 text-[15px] font-bold ${p.tier === "PROFESSIONAL" ? "bg-pine-light/50" : ""}`}>
                    {p.name}
                    <span className="block text-[13px] font-medium text-ink-soft">{p.priceMonthly ? `${money(p.priceMonthly)} a month` : "Free"}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {compareRows(plans).map(([label, ...cells]) => (
                <tr key={label as string}>
                  <th scope="row" className="px-4 py-2.5 font-medium text-ink">{label}</th>
                  {cells.map((c, i) => (
                    <td key={i} className={`px-4 py-2.5 ${plans[i]?.tier === "PROFESSIONAL" ? "bg-pine-light/25" : ""} ${c === "—" ? "text-ink-faint" : c === "✓" ? "font-bold text-pine" : ""}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="see-it" aria-labelledby="see-it-heading" className="relative mt-12 scroll-mt-24 rounded-[28px] border border-line bg-white p-5 sm:p-8">
        {PLAN_GUIDE_KEYS.map((k) => <span key={k} id={`demo-${PLAN_GUIDES[k].slug}`} className="absolute -top-24" aria-hidden="true" />)}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-dark">See it in action</p>
            <h2 id="see-it-heading" className="mt-1 text-[28px] [text-wrap:balance]">A short demo of every plan and paid extra</h2>
            <p className="mt-1.5 max-w-[62ch] text-[14.5px] text-ink-soft">Pick one to watch how it works, read what's included in depth, and download its PDF guide.</p>
          </div>
          <a href={planPdfPath("ALL")} target="_blank" rel="noopener" className="btn-secondary">Full pricing guide (PDF)</a>
        </div>
        <PlanShowcase prices={prices} />
      </section>

      <ProServicesNudge className="mt-8" />

      <section id="boosts" className="mt-12 overflow-hidden rounded-card border border-pine/25 bg-white shadow-[0_1px_2px_rgba(21,42,58,.03)]">
        <div className="bg-pine p-6 text-white sm:p-8">
          <span className="text-[12px] font-bold uppercase tracking-widest text-white/75!">Short visibility push</span>
          <h2 className="mt-2 text-[28px] font-bold text-white!">24-hour advert boosts</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/85!">
            A boosted advert leads for its first three hours, then rotates hourly with other active boosts. Every boost displays a real countdown and ends automatically after 24 hours.
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <div className="mb-7 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
            <PlanDemo kind="BOOST" />
            <div>
              <h3 className="text-[19px]">What happens when you boost</h3>
              <ol className="mt-3 space-y-3 text-[14.5px] text-ink-soft">
                <li><strong className="text-ink">Hours 0 to 3:</strong> your advert leads matching search results.</li>
                <li><strong className="text-ink">Hours 3 to 24:</strong> it shares the top positions with other boosted adverts, rotating every hour.</li>
                <li><strong className="text-ink">After 24 hours:</strong> it ends by itself. Nothing to cancel.</li>
              </ol>
              <p className="mt-4 text-[13.5px] text-ink-soft">Professional includes 3 boosts and Business 1 boost every billing period.</p>
              <a href={planPdfPath("BOOST")} target="_blank" rel="noopener" className="btn-ghost mt-2 px-0">Boosts guide (PDF) →</a>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {Object.entries(BOOST_PACKAGES).map(([key, pack]) => (
              <div key={key} className={`rounded-card border p-5 transition hover:-translate-y-0.5 hover:shadow-raise ${key === "THREE" ? "border-2 border-pine" : "border-line"}`}>
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-pine-dark">{pack.shortLabel}</span>
                <h3 className="mt-1 text-[20px] font-bold">{pack.label}</h3>
                <p className="mt-3 font-display text-[30px]">{money(pack.amount)}</p>
                <p className="text-[13px] text-ink-faint">{money(Math.round(pack.amount / pack.credits))} per boost</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <p className="text-[13px] text-ink-faint">One-off payment. Credits can be used on any live advert and do not expire.</p>
            {provider ? (
              <Link href="/provider/adverts" className="btn-primary">Choose an advert to boost</Link>
            ) : signedIn ? (
              <Link href="/provider/create" className="btn-primary">Set up your provider company</Link>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link href="/login?next=/provider/adverts" className="btn-primary">Sign in to boost an advert</Link>
                <Link href="/register?type=PROVIDER" className="btn-secondary">Create a provider account</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="sponsored" className="mt-12 overflow-hidden rounded-card border border-line bg-white shadow-[0_1px_2px_rgba(21,42,58,.03)]">
        <div className="grid gap-6 border-b border-line bg-paper-sunk/60 p-6 lg:grid-cols-[1.1fr_.9fr] lg:p-8">
          <div>
            <span className="chip border-clay/30 bg-clay-light text-clay">Optional paid promotion</span>
            <h2 className="mt-3 text-[26px]">Sponsored adverts</h2>
            <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
              Put a live vacancy in the clearly labelled sponsored section at the top of relevant first-page searches, with a highlighted map pin.
            </p>
          </div>
          <ul className="flex flex-col gap-2.5 text-[14px] text-ink-soft">
            <Feature>Only shown when the advert matches the person&apos;s filters</Feature>
            <Feature>Always labelled Sponsored, including on the map</Feature>
            <Feature>Reserved sponsored lane — active placements never drop into the free-advert section</Feature>
            <Feature>Every active sponsored advert is shown, with no cap on how many appear</Feature>
            <Feature>Does not affect verification, moderation or organic ranking</Feature>
          </ul>
        </div>
        <div className="grid gap-6 border-b border-line p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:p-8">
          <PlanDemo kind="SPONSORED" />
          <div>
            <h3 className="text-[19px]">Sponsored or boosted?</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
              A <strong className="text-ink">boost</strong> is a 24-hour push to the top of results. A <strong className="text-ink">sponsored advert</strong> keeps a reserved, labelled spot on the first page for {SPONSOR_PACKAGES.WEEK.days}, {SPONSOR_PACKAGES.MONTH.days} or {SPONSOR_PACKAGES.QUARTER.days} days, with a highlighted map pin. You can sponsor your main property and boost a room when it comes free.
            </p>
            <p className="mt-3 text-[13.5px] text-ink-soft">Professional includes one free 7-day placement at a time, Business two.</p>
            <a href={planPdfPath("SPONSORED")} target="_blank" rel="noopener" className="btn-ghost mt-2 px-0">Sponsored adverts guide (PDF) →</a>
          </div>
        </div>
        <div className="p-6 lg:p-8">
          <SponsorDurationPicker provider={provider} signedIn={signedIn} livePayments={livePayments} />
        </div>
      </section>
    </div>
  );
}

const guideFor = (tier: string): PlanGuideKey | undefined => (tier === "FREE" || tier === "PROFESSIONAL" || tier === "BUSINESS" ? tier : undefined);

function GuideLinks({ guide }: { guide?: PlanGuideKey }) {
  if (!guide) return null;
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13.5px] font-semibold">
      <a href={`#demo-${PLAN_GUIDES[guide].slug}`} className="text-pine-dark hover:underline">▶ Watch the demo</a>
      <a href={planPdfPath(guide)} target="_blank" rel="noopener" className="text-pine-dark hover:underline">PDF guide</a>
    </div>
  );
}

type PlanRow = { tier: string; maxListings: number; maxRooms: number; maxStaff: number; maxPhotos: number; videoUploads: boolean; analytics: boolean; priorityPlacement: boolean; featuredCredits: number; includedBoosts: number; prioritySupport: boolean };

/** Rows for the provider comparison table, read from the live catalogue. */
function compareRows(plans: PlanRow[]): string[][] {
  const lim = (n: number) => (n === -1 ? "Unlimited" : String(n));
  const yes = (b: boolean) => (b ? "✓" : "—");
  return [
    ["Live adverts", ...plans.map((p) => lim(p.maxListings))],
    ["Rooms", ...plans.map((p) => lim(p.maxRooms))],
    ["Staff accounts", ...plans.map((p) => lim(p.maxStaff))],
    ["Photos per advert", ...plans.map((p) => lim(p.maxPhotos))],
    ["Video uploads", ...plans.map((p) => yes(p.videoUploads))],
    ["Stories on search", ...plans.map((p) => (p.tier === "FREE" ? "—" : p.videoUploads ? "Photo and video" : "Photo"))],
    ["Advert analytics", ...plans.map((p) => yes(p.analytics))],
    ["Priority placement in search", ...plans.map((p) => yes(p.priorityPlacement))],
    ["Included 24-hour boosts", ...plans.map((p) => (p.includedBoosts ? `${p.includedBoosts} per billing period` : "—"))],
    ["Free 7-day sponsored placements", ...plans.map((p) => (p.featuredCredits ? `${p.featuredCredits} at a time` : "—"))],
    ["WhatsApp enquiry button", ...plans.map((p) => (p.tier === "BUSINESS" ? "Included" : p.tier === "PROFESSIONAL" ? `${WHATSAPP_ADDON_LABEL} add-on` : "—"))],
    ["Priority support", ...plans.map((p) => yes(p.prioritySupport))],
    ["Buy extra boosts and sponsorship", ...plans.map(() => "✓")],
  ];
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
