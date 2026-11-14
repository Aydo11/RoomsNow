import Link from "next/link";
import { neighbourhoodGuides } from "@/lib/neighbourhood-guides";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Supported Accommodation in Birmingham by Area", description: "Supported accommodation and HMO rooms across Birmingham: Erdington, Handsworth, Aston, Sutton Coldfield, Small Heath, Selly Oak, Northfield and more. Live rooms and local services.", path: "/areas/birmingham" });

export default function BirminghamGuidesPage() {
  return <main className="shell py-10 sm:py-14">
    <span className="eyebrow">Birmingham by area</span>
    <h1 className="mt-3 text-[34px] leading-tight sm:text-[46px]">Supported accommodation in Birmingham</h1>
    <p className="mt-4 max-w-[65ch] text-[17px] leading-relaxed text-ink-soft">Find a room and the services around it. These practical neighbourhood guides bring together travel, health, food support and available accommodation, with links to the organisations that run the services.</p>
    <div className="mt-8 grid gap-5 md:grid-cols-3">{neighbourhoodGuides.map((guide) => <Link key={guide.slug} href={`/areas/birmingham/${guide.slug}`} className="card interactive-card p-6"><span className="eyebrow">{guide.postcodes.join(", ")}</span><h2 className="mt-3 text-[25px]">{guide.name}</h2><p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{guide.summary}</p><span className="mt-5 block font-semibold text-pine-dark">See rooms in {guide.name} →</span></Link>)}</div>
    <Link className="btn-secondary mt-8" href="/housing-benefit-calculator">Check rent against your LHA cap</Link>
  </main>;
}
