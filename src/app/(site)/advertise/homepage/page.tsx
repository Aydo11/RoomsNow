import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { pageMetadata } from "@/lib/seo";
import { formatPounds, SPOTLIGHT_PACKAGES, SPOTLIGHT_ROTATE_MS } from "@/lib/spotlight";
import { organisationFor } from "@/lib/spotlight-server";
import { BuySpotlightForm } from "@/components/spotlight-forms";
import { FormSuccess } from "@/components/ui";

export const metadata = pageMetadata({
  title: "Homepage Spotlight for Service Businesses",
  description: "Put your service in front of every housing provider who visits RoomsNow: a sponsored spotlight directly under the homepage search.",
  path: "/advertise/homepage",
});
export const dynamic = "force-dynamic";

const POINTS = [
  ["Seen first", "Your spotlight sits directly under the homepage search, the first thing people see after they arrive."],
  ["Every provider who visits", "Housing providers, managing agents, councils and support workers all start on the homepage."],
  ["Goes live straight away", "Pay by card and you're on the homepage as soon as payment clears. No waiting for a sales call."],
  ["Fair rotation", `If several services are in the spotlight, they take turns every ${SPOTLIGHT_ROTATE_MS / 1000} seconds, so everyone gets seen.`],
] as const;

export default async function HomepageSpotlightPage({ searchParams }: { searchParams: Promise<{ spotlight?: string }> }) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const org = user ? await organisationFor(user.id) : null;

  return (
    <>
      <section className="surface-home border-b border-line">
        <div className="shell py-12 sm:py-16">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-dark">For trades and service businesses</p>
          <h1 className="mt-2 max-w-[22ch] text-balance text-[34px] font-bold leading-[1.08] sm:text-[48px]">Put your service on the RoomsNow homepage</h1>
          <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-ink-soft">
            The homepage spotlight is the most visible place on RoomsNow. It shows your business, a headline and a short description,
            and links straight to your Provider Services profile.
          </p>
          <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
            {(Object.keys(SPOTLIGHT_PACKAGES) as Array<keyof typeof SPOTLIGHT_PACKAGES>).map((key) => (
              <span key={key}><strong className="tabular-nums">{formatPounds(SPOTLIGHT_PACKAGES[key].amount)}</strong> <span className="text-ink-soft">for {SPOTLIGHT_PACKAGES[key].label}</span></span>
            ))}
          </p>
        </div>
      </section>

      <section className="shell grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ul className="space-y-6">
          {POINTS.map(([title, body]) => (
            <li key={title}>
              <h2 className="text-[19px]">{title}</h2>
              <p className="mt-1 max-w-[52ch] text-[15px] leading-relaxed text-ink-soft">{body}</p>
            </li>
          ))}
          <li className="text-[13.5px] text-ink-faint">
            Spotlights are always labelled as sponsored. RoomsNow can pause or remove any spotlight that breaks our rules, and payment links,
            bank details and blocked words aren&apos;t allowed.
          </li>
        </ul>

        <div className="card p-5 sm:p-6">
          {query.spotlight === "complete" && <div className="mb-5"><FormSuccess message="Payment received. Your spotlight is live on the homepage (or will start when your current one ends)." /></div>}
          {!user ? (
            <>
              <h2 className="text-xl">Sign in to buy a spotlight</h2>
              <p className="mt-2 text-[15px] text-ink-soft">The spotlight is open to approved service businesses on RoomsNow Provider Services.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/login?next=/advertise/homepage" className="btn-primary">Sign in</Link>
                <Link href="/advertise-services" className="btn-secondary">List your services</Link>
              </div>
            </>
          ) : !org ? (
            <>
              <h2 className="text-xl">For service businesses</h2>
              <p className="mt-2 text-[15px] text-ink-soft">
                The spotlight is for services, so it needs an approved service business on Provider Services. Once your business is approved, you can buy a spotlight here.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl">Your spotlight for {org.orgName}</h2>
              <p className="mt-1 mb-5 text-[14px] text-ink-soft">Write it below and check the preview. This is exactly how it will appear.</p>
              <BuySpotlightForm orgName={org.orgName} logoUrl={org.logoUrl} />
            </>
          )}
        </div>
      </section>
    </>
  );
}
