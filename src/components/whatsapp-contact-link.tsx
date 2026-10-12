import { clsx } from "@/lib/clsx";

export function WhatsappContactLink({ listingId, title, compact = false, className }: { listingId: string; title: string; compact?: boolean; className?: string }) {
  return (
    <a href={`/api/whatsapp/${listingId}`} rel="nofollow" title="Enquire on WhatsApp"
      aria-label={`Enquire on WhatsApp about ${title}`}
      className={clsx("relative z-20 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 bg-[#087f45] text-white hover:bg-[#066739] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2", compact ? "h-11 w-11 rounded-full" : "rounded-[10px] px-3 py-2 text-[14px] font-semibold", className)}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-13.4 7.9L3 21l1.6-4.6A9 9 0 1 1 21 11.5Z" /><path d="M8 7.5c0 4.2 3 7.2 7.3 7.5l1-2-2.5-1-1 1a7 7 0 0 1-2.8-2.8l1-1-1-2.5-2 .8Z" /></svg>
      {!compact && <span>WhatsApp</span>}
    </a>
  );
}
