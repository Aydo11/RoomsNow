import Link from "next/link";
import { Stars } from "./star-rating";
import { BoostedLabel, BusinessLogo, ServiceVerifiedBadge } from "./service-ui";
import { ServiceFavouriteButton } from "./service-buyer-forms";
import { categoryLabel, priceLabel, responseLabel, type ServicePreviewCard } from "@/lib/service-marketplace";
import type { MarketAdvert } from "@/server/service-marketplace";
import { clsx } from "@/lib/clsx";

export function ServicesTabs({ active }: { active: "browse" | "saved" | "quotes" }) {
  const tabs = [
    { key: "browse", href: "/services", label: "Browse services" },
    { key: "saved", href: "/services/saved", label: "Saved" },
    { key: "quotes", href: "/services/quotes", label: "Quote requests" },
  ] as const;
  return (
    <nav aria-label="Provider Services" className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <Link key={tab.key} href={tab.href} aria-current={active === tab.key ? "page" : undefined} className={clsx("chip", active === tab.key && "chip-active")}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** Full card — only ever rendered for viewers with full marketplace access. */
export function ServiceAdvertCard({ advert, promoted, saved, canSave = true }: { advert: MarketAdvert; promoted: boolean; saved: boolean; canSave?: boolean }) {
  const area = advert.nationwide || advert.business.nationalCoverage ? "Nationwide" : [...advert.locations, ...advert.business.areas].slice(0, 3).join(", ");
  const response = responseLabel(advert.business.responseMinutes);
  return (
    <article className={clsx("card flex flex-col overflow-hidden", promoted && "border-brand/50 shadow-raise")}>
      {advert.image && (
        <Link href={`/services/ad/${advert.id}${promoted ? "?from=boost" : ""}`} tabIndex={-1} aria-hidden="true">
          <img src={advert.image} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
        </Link>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <BusinessLogo src={advert.business.logoUrl} name={advert.business.displayName} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-ink-soft">{advert.business.displayName}</p>
            <h3 className="text-[16px] leading-snug">
              <Link href={`/services/ad/${advert.id}${promoted ? "?from=boost" : ""}`} className="hover:underline">{advert.title}</Link>
            </h3>
          </div>
          {canSave && <ServiceFavouriteButton advertId={advert.id} saved={saved} compact />}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {promoted && <BoostedLabel />}
          {advert.business.verified && <ServiceVerifiedBadge compact />}
          {(advert.emergency || advert.sameDay) && <span className="rounded-pill bg-clay-light px-2 py-0.5 text-[11.5px] font-medium text-clay">{advert.emergency ? "Emergency call-outs" : "Same day"}</span>}
        </div>
        <p className="text-[13px] text-ink-soft">
          {categoryLabel(advert.category)}
          {advert.subcategory ? ` · ${advert.subcategory}` : ""}
          {area ? ` · ${area}` : ""}
        </p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-line pt-3">
          <div>
            <p className="font-semibold text-ink">{priceLabel(advert)}</p>
            {response && <p className="text-[12px] text-ink-faint">{response}</p>}
          </div>
          {advert.business.rating !== null ? (
            <span className="flex items-center gap-1 text-[13px] text-ink-soft"><Stars rating={advert.business.rating} /> {advert.business.rating.toFixed(1)} ({advert.business.reviewCount})</span>
          ) : (
            <span className="text-[12px] text-ink-faint">No reviews yet</span>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Preview card for free providers. It takes only the redacted shape, so there
 * is nothing identifying in the page to un-blur: the "name" bars are empty
 * shapes and the card isn't a link.
 */
export function ServicePreviewTile({ card }: { card: ServicePreviewCard }) {
  return (
    <article className="card relative flex flex-col gap-3 overflow-hidden p-4" aria-label={`${card.categoryLabel} service in ${card.area}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="h-11 w-11 shrink-0 rounded-[10px] bg-paper-sunk" />
        <div className="min-w-0 flex-1 space-y-2 pt-1" aria-hidden="true">
          <span className="block h-3 w-2/3 rounded-full bg-paper-sunk" />
          <span className="block h-3 w-1/2 rounded-full bg-paper-sunk" />
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-paper-sunk text-ink-faint" title="Upgrade to see who this is">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="2" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></svg>
          <span className="sr-only">Business details are for paid members</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {card.verified && <ServiceVerifiedBadge compact />}
        {card.emergency && <span className="rounded-pill bg-clay-light px-2 py-0.5 text-[11.5px] font-medium text-clay">Emergency or same day</span>}
      </div>
      <p className="text-[14px] font-medium text-ink">{card.subcategory ?? card.categoryLabel}</p>
      <p className="text-[13px] text-ink-soft">{card.categoryLabel} · {card.area}</p>
      <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-[13px]">
        <span className="font-semibold text-ink">{card.priceLabel}</span>
        {card.rating !== null ? <span className="flex items-center gap-1 text-ink-soft"><Stars rating={card.rating} /> ({card.reviewCount})</span> : <span className="text-ink-faint">New</span>}
      </div>
    </article>
  );
}
