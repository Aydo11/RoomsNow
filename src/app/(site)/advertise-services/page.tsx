import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { pageMetadata } from "@/lib/seo";
import { SERVICE_CATEGORIES, SERVICE_PLANS, SERVICE_TRIAL_DAYS } from "@/lib/service-marketplace";
import { BOOST_PACKAGES } from "@/lib/boost-packages";
import { SPONSOR_PACKAGES } from "@/lib/sponsor-packages";

export const metadata = pageMetadata({
  title: "Advertise Your Services to Supported Housing Providers",
  description:
    "Trades and suppliers: advertise to supported, exempt and HMO accommodation providers on RoomsNow. Get quote requests from paying providers. 14-day free trial.",
  path: "/advertise-services",
});

const gbp = (pence: number) => `£${(pence / 100).toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;

const STEPS = [
  ["Create your business profile", "Tell providers what you do, where you work and how you price. It takes about ten minutes."],
  ["Publish your adverts", "Each advert is reviewed by our team before it goes live, usually within a working day."],
  ["Get verified (optional)", "Upload your public liability insurance and proof of incorporation. Verified businesses get a badge and show higher in results."],
  ["Receive quote requests", "Paying providers message you and send structured quote requests. You reply, quote and agree the job directly."],
] as const;

export default async function AdvertiseServicesPage() {
  const user = await getCurrentUser();
  const isServiceBusiness = user?.role === "SERVICE_PROVIDER";
  const startHref = isServiceBusiness ? "/service-provider/plan" : "/register?type=SERVICE_PROVIDER";
  const startLabel = isServiceBusiness ? "Choose your plan" : `Start your ${SERVICE_TRIAL_DAYS}-day free trial`;

  return (
    <>
      <section className="surface-home border-b border-line">
        <div className="shell py-12 sm:py-16">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-dark">For trades and suppliers</p>
          <h1 className="mt-2 max-w-[20ch] text-balance text-[36px] font-bold leading-[1.08] sm:text-[50px]">
            Win work from supported housing providers
          </h1>
          <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-ink-soft">
            RoomsNow providers run HMOs, supported and exempt accommodation across the UK. They need gas and electrical certificates, void cleans, repairs,
            furniture packs and more — often at short notice. Provider Services puts your business in front of them.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href={startHref} className="btn-primary">{startLabel}</Link>
            <a href="#plans" className="btn-secondary">See plans</a>
          </div>
          <p className="mt-3 text-[13px] text-ink-faint">No card charged during the trial. Cancel any time.</p>
        </div>
      </section>

      {user?.role === "PROVIDER" && (
        <div className="shell pt-6">
          <p className="card flex flex-wrap items-center justify-between gap-3 p-4 text-[14px] text-ink-soft">
            <span>Looking for a trade or supplier for your properties?</span>
            <Link href="/services" className="btn-secondary">Browse Provider Services</Link>
          </p>
        </div>
      )}

      <section className="shell py-12 sm:py-14" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-[28px]">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="card p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-pine text-[13px] font-semibold text-white">{index + 1}</span>
              <h3 className="mt-4 text-[17px]">{title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="plans" className="scroll-mt-20 border-y border-line bg-paper-card" aria-labelledby="plans-heading">
        <div className="shell py-12 sm:py-14">
          <h2 id="plans-heading" className="text-[28px]">Plans</h2>
          <p className="mt-2 max-w-[60ch] text-[15px] text-ink-soft">
            Start on Free with up to {SERVICE_PLANS.FREE.maxAdverts} adverts, or try a paid plan free for {SERVICE_TRIAL_DAYS} days. RoomsNow doesn&apos;t take a cut of the work you win.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {Object.values(SERVICE_PLANS).map((plan) => {
              const pro = plan.tier === "PRO";
              const free = plan.monthly === 0;
              return (
                <article key={plan.tier} className={`flex flex-col rounded-card border p-6 ${pro ? "border-pine bg-pine-light/40 shadow-raise" : "border-line bg-paper"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[20px]">{plan.name}</h3>
                    {pro && <span className="rounded-pill bg-pine px-2.5 py-1 text-[11.5px] font-semibold text-white">Most reach</span>}
                  </div>
                  <p className="mt-3">
                    <span className="font-display text-[34px] font-bold tabular-nums text-ink">{free ? "Free" : gbp(plan.monthly)}</span>
                    {!free && <span className="text-[14px] text-ink-soft"> a month</span>}
                  </p>
                  <ul className="mt-4 space-y-2 text-[14.5px] text-ink-soft">
                    {plan.features.map((feature) => (
                      <li key={feature} className={`flex gap-2 ${feature.startsWith("No ") ? "text-ink-faint" : ""}`}>
                        {feature.startsWith("No ") ? (
                          <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 10h10" strokeLinecap="round" /></svg>
                        ) : (
                          <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-pine" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={startHref} className={`${pro ? "btn-primary" : "btn-secondary"} mt-6 justify-center`}>{free ? (isServiceBusiness ? "Choose Free" : "Start free") : startLabel}</Link>
                </article>
              );
            })}
          </div>

          <h3 className="mt-10 text-[20px]">Boost or sponsor an advert</h3>
          <p className="mt-1 max-w-[60ch] text-[14.5px] text-ink-soft">
            Boosts use the same prices as accommodation adverts: every credit gives you 24 hours above matching results. For longer campaigns, sponsor an advert for 7, 30 or 90 days. Every paid placement is clearly labelled.
          </p>
          <h4 className="mt-4 text-[14px] font-semibold">24-hour boost credits</h4>
          <dl className="mt-2 grid max-w-xl grid-cols-3 gap-3">
            {Object.values(BOOST_PACKAGES).map((boost) => (
              <div key={boost.label} className="rounded-card border border-line bg-paper p-4 text-center">
                <dt className="text-[13px] text-ink-soft">{boost.label}</dt>
                <dd className="mt-1 font-display text-[22px] font-bold tabular-nums text-ink">{gbp(boost.amount)}</dd>
              </div>
            ))}
          </dl>
          <h4 className="mt-5 text-[14px] font-semibold">Sponsored placements</h4>
          <ul className="mt-2 flex flex-wrap gap-2 text-[14px]">{Object.values(SPONSOR_PACKAGES).map((pack) => <li key={pack.label} className="chip">{pack.label} · {gbp(pack.amount)}</li>)}</ul>
        </div>
      </section>

      <section className="shell py-12 sm:py-14" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="text-[28px]">What providers look for</h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {SERVICE_CATEGORIES.filter((category) => category.slug !== "other").map((category) => (
            <li key={category.slug} className="chip">{category.label}</li>
          ))}
        </ul>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["Only paying providers", "Your contact details are shown only to accommodation providers on a paid RoomsNow membership."],
            ["Verified badge", "Once our team has checked your insurance and incorporation, your adverts carry a Verified Service Provider badge."],
            ["Reviews from real jobs", "Providers can only review you after a job is marked complete, so your rating reflects work you've done."],
          ].map(([title, body]) => (
            <div key={title} className="card p-5">
              <h3 className="text-[17px]">{title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href={startHref} className="btn-primary">{startLabel}</Link>
          {!user && <Link href="/login?next=/service-provider" className="btn-ghost">I already have an account</Link>}
        </div>
        <p className="mt-6 max-w-[70ch] text-[12.5px] text-ink-faint">
          RoomsNow introduces service businesses to accommodation providers. Contracts, payments and guarantees are agreed directly between you and the provider.
          See our <Link href="/terms" className="underline underline-offset-2">terms</Link>.
        </p>
      </section>
    </>
  );
}
