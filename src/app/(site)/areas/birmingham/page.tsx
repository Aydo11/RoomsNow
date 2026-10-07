import Link from "next/link";
import { neighbourhoodGuides } from "@/lib/neighbourhood-guides";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Birmingham Neighbourhood Guides & Available Rooms", description: "Explore Erdington, Handsworth and Small Heath: transport, GP services, food support, rent help and live accommodation on RoomsNow.", path: "/areas/birmingham" });

export default function BirminghamGuidesPage() {
  return <main className="shell py-10 sm:py-14">
    <span className="eyebrow">Get to know your area</span>
    <h1 className="mt-3 text-[34px] leading-tight sm:text-[46px]">Living in Birmingham</h1>
    <p className="mt-4 max-w-[65ch] text-[17px] leading-relaxed text-ink-soft">Find a room and the services around it. These practical neighbourhood guides bring together travel, health, food support and available accommodation, with links to the organisations that run the services.</p>
    <div className="mt-8 grid gap-5 md:grid-cols-3">{neighbourhoodGuides.map((guide) => <Link key={guide.slug} href={`/areas/birmingham/${guide.slug}`} className="card interactive-card p-6"><span className="eyebrow">Neighbourhood guide</span><h2 className="mt-3 text-[25px]">Living in {guide.name}</h2><p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{guide.summary}</p><span className="mt-5 block font-semibold text-pine-dark">Explore the area and rooms →</span></Link>)}</div>
    <Link className="btn-secondary mt-8" href="/housing-benefit-calculator">Check rent against your LHA cap</Link>
  </main>;
}
