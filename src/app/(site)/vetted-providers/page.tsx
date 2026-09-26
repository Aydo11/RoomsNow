import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { VettedProvidersView, type VettedParams } from "@/components/vetted-providers-view";

export const metadata = pageMetadata({
  title: "Vetted Supported Accommodation Providers (CQC & BVSC)",
  description:
    "Browse supported accommodation providers whose CQC registration or BVSC recognition has been checked by RoomsNow, and see their available rooms.",
  path: "/vetted-providers",
});
export const dynamic = "force-dynamic";

export default async function PublicVettedProvidersPage({ searchParams }: { searchParams: Promise<VettedParams> }) {
  const params = await searchParams;
  return (
    <div className="shell py-8 sm:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[70ch]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-dark">Vetted providers</p>
          <h1 className="mt-1 text-balance text-[30px] leading-tight sm:text-[36px]">Rooms from vetted providers</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            Providers with a CQC registration or BVSC recognition that the RoomsNow team has checked against evidence. Browse them and their live rooms below.
          </p>
        </div>
        <Link href="/search?vetted=1" className="btn-secondary">Search with more filters</Link>
      </header>
      <VettedProvidersView params={params} basePath="/vetted-providers" />
    </div>
  );
}
