import Link from "next/link";
import { CouncilPilotForm } from "@/components/council-pilot-form";
import { StatCard } from "@/components/dashboard-shell";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { brand } from "@/brand.config";

export const metadata = pageMetadata({
  title: "RoomsNow for councils and commissioning teams",
  description: "Preview the RoomsNow council dashboard, see recently confirmed Birmingham vacancies and request a council pilot.",
  path: "/for-councils",
});
export const dynamic = "force-dynamic";

export default async function ForCouncilsPage() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const vacancies = await db.listing.findMany({
    where: {
      status: "ACTIVE", company: { status: "ACTIVE" }, availabilityConfirmedAt: { gte: since },
      property: { city: { equals: "Birmingham", mode: "insensitive" } }, rooms: { some: { status: "AVAILABLE" } },
    },
    orderBy: [{ availabilityConfirmedAt: "desc" }, { id: "asc" }],
    take: 8,
    select: { id: true, title: true, availabilityConfirmedAt: true, property: { select: { area: true } }, _count: { select: { rooms: { where: { status: "AVAILABLE" } } } } },
  }).catch(() => null);

  return (
    <div className="shell max-w-5xl space-y-8 py-10 sm:py-14">
      <header className="space-y-4">
        <p className="font-semibold text-pine-dark">FOR COUNCILS AND COMMISSIONERS</p>
        <h1 className="text-[clamp(2rem,6vw,3.2rem)] leading-tight">See vacancies and referral outcomes in your area</h1>
        <p className="max-w-2xl text-ink-soft">Try a preview without an account or real client data. The private council dashboard reports activity recorded on RoomsNow, not the whole local housing market.</p>
        <div className="flex flex-wrap gap-3"><a href="#pilot" className="btn-primary">Request a pilot</a><Link href="/council" className="btn-secondary">Sign in to council view</Link></div>
      </header>
      <section aria-labelledby="demo-title" className="card space-y-4 p-5 sm:p-7">
        <span className="inline-flex rounded-full bg-clay-light px-3 py-1 text-sm font-semibold text-clay">Demo data · illustrative only</span>
        <h2 id="demo-title" className="text-2xl">Council dashboard preview</h2>
        <p className="text-ink-soft">Example figures for a fictional area. These figures do not represent Birmingham or any real placements.</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Rooms free now" value={24} />
          <StatCard label="Referrals in 90 days" value={31} />
          <StatCard label="Move-ins recorded" value={11} />
          <StatCard label="Typical first update" value="2 days" hint="Example: 19 referrals with a provider update" />
        </div>
      </section>
      <section aria-labelledby="vacancy-brief" className="card p-5 sm:p-7">
        <h2 id="vacancy-brief" className="text-2xl">Birmingham weekly vacancy brief</h2>
        <p className="mt-2 text-ink-soft">A live shortlist of up to eight RoomsNow adverts with rooms available and availability confirmed in the last seven days. Confirm suitability and availability directly with the provider.</p>
        {vacancies?.length ? <ul className="mt-3 divide-y divide-line">
          {vacancies.map((listing) => <li key={listing.id} className="py-3">
            <Link href={`/listings/${listing.id}`} className="font-semibold text-pine-dark hover:underline">{listing.title}</Link>
            <p className="text-sm text-ink-soft">{listing.property.area || "Birmingham"} · {listing._count.rooms} available · confirmed {listing.availabilityConfirmedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" })}</p>
          </li>)}
        </ul> : <p className="mt-3 text-ink-soft">{vacancies ? "No recently confirmed vacancies to show right now." : "The vacancy brief is temporarily unavailable."}</p>}
        <Link href="/search?where=Birmingham" className="btn-secondary mt-4">Browse Birmingham vacancies</Link>
      </section>
      <section id="pilot" className="card scroll-mt-24 p-5 sm:p-7">
        <h2 className="text-2xl">Request a council pilot</h2>
        <p className="mt-2 text-ink-soft">Tell us which area you cover. We’ll follow up to discuss your team’s needs and confirm access separately. You can also email <a href={`mailto:${brand.supportEmail}`} className="text-pine-dark underline">{brand.supportEmail}</a>.</p>
        <CouncilPilotForm />
      </section>
    </div>
  );
}
