import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-header";

/**
 * Any address that doesn't exist. It has its own title (instead of the
 * homepage's), stays out of search results, and points people and crawlers
 * back to the pages that matter rather than a dead end.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const LINKS = [
  ["Search available rooms", "/search"],
  ["HMO rooms", "/hmo-rooms"],
  ["Supported accommodation", "/supported-accommodation"],
  ["Supported housing by area", "/supported-housing"],
  ["Helpful guides", "/guides"],
  ["Advertise your rooms", "/advertise-accommodation"],
] as const;

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="shell max-w-[760px] py-16 text-center sm:py-24">
        <p className="text-[13px] font-semibold tracking-[0.08em] text-pine-dark">PAGE NOT FOUND</p>
        <h1 className="mt-3 text-[clamp(1.8rem,5vw,2.6rem)] font-bold leading-tight">We couldn&rsquo;t find that page</h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink-soft">
          The advert may have been filled or taken down, or the link may be mistyped. These will get you back on track:
        </p>
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {LINKS.map(([label, href]) => (
            <li key={href}>
              <Link href={href} className="chip hover:border-pine hover:text-pine-dark">{label}</Link>
            </li>
          ))}
        </ul>
        <Link href="/" className="btn-primary mt-10 inline-flex">Go to the homepage</Link>
      </main>
      <SiteFooter />
    </>
  );
}
