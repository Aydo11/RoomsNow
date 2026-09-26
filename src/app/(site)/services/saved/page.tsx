import Link from "next/link";
import { db } from "@/lib/db";
import { loadPublicAdverts, requireFullMarketplace } from "@/server/service-marketplace";
import { ServiceAdvertCard, ServicesTabs } from "@/components/service-cards";

export const metadata = { title: "Saved services", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SavedServicesPage() {
  const user = await requireFullMarketplace("/services/saved");
  const [favourites, adverts] = await Promise.all([
    db.serviceFavourite.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { advertId: true } }),
    loadPublicAdverts(),
  ]);
  const byId = new Map(adverts.map((advert) => [advert.id, advert]));
  const saved = favourites.map((f) => byId.get(f.advertId)).filter((a): a is NonNullable<typeof a> => Boolean(a));
  const hidden = favourites.length - saved.length;

  return (
    <div className="shell py-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[26px] sm:text-[30px]">Saved services</h1>
        <ServicesTabs active="saved" />
      </header>
      {saved.length === 0 ? (
        <div className="card mt-6 p-6 text-[15px] text-ink-soft">Nothing saved yet. Tap the heart on any service to keep it here. <Link className="text-brand underline" href="/services">Browse services</Link></div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((advert) => <li key={advert.id}><ServiceAdvertCard advert={advert} promoted={false} saved canSave={user.role === "PROVIDER"} /></li>)}
        </ul>
      )}
      {hidden > 0 && <p className="mt-4 text-[13px] text-ink-faint">{hidden} saved {hidden === 1 ? "advert is" : "adverts are"} no longer available.</p>}
    </div>
  );
}
