import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProDemo, type DemoKind } from "@/components/pro-demo";
import { DEMO_SLUG, DEMO_STORIES, PRO_SERVICES, packPdfPath } from "@/lib/pro-services";
import { PlanDemo } from "@/components/plan-demo";
import { PLAN_GUIDES, PLAN_GUIDE_KEYS, planGuideBySlug, planPdfPath, type PlanGuideKey } from "@/lib/plan-guides";

/** Public, shareable demo pages, one per Pro Service: /demos/crm, /demos/website… */
const SLUGS: Record<string, DemoKind | undefined> = Object.fromEntries(Object.entries(DEMO_SLUG).map(([k, v]) => [v, k as DemoKind]));
const slugFor = (kind: DemoKind) => DEMO_SLUG[kind];

export function generateStaticParams() {
  return [...Object.keys(SLUGS), ...PLAN_GUIDE_KEYS.map((k) => PLAN_GUIDES[k].slug)].map((service) => ({ service }));
}

export async function generateMetadata({ params }: { params: Promise<{ service: string }> }): Promise<Metadata> {
  const { service } = await params;
  const plan = planGuideBySlug(service);
  if (plan) return { title: `${PLAN_GUIDES[plan].name} demo`, description: `${PLAN_GUIDES[plan].headline}. ${PLAN_GUIDES[plan].whoFor}`, alternates: { canonical: `/demos/${service}` } };
  const kind = SLUGS[service];
  if (!kind) return {};
  const s = PRO_SERVICES[kind];
  return { title: `${s.name} demo`, description: `${s.headline}. ${s.helps}`, alternates: { canonical: `/demos/${slugFor(kind)}` } };
}

export default async function DemoPage({ params, searchParams }: { params: Promise<{ service: string }>; searchParams: Promise<{ record?: string }> }) {
  const { service } = await params;
  const { record } = await searchParams;
  const plan = planGuideBySlug(service);
  if (plan) return <PlanDemoPage plan={plan} record={Boolean(record)} />;
  const kind = SLUGS[service];
  if (!kind) notFound();
  // Bare, full-frame player for screen recording the advert videos.
  if (record) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#171F2E]">
        <style>{`aside[aria-label="Cookie preferences"]{display:none!important}`}</style>
        <div className="w-full max-w-[1920px]"><ProDemo kind={kind} autoPlay bare /></div>
      </main>
    );
  }
  const s = PRO_SERVICES[kind];
  return (
    <main className="min-h-dvh bg-[#121a28] px-4 pb-16 text-white">
      <div className="mx-auto max-w-[1080px]">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="text-[20px] font-bold">Rooms<span className="text-[#549DE5]">Now</span></Link>
          <Link href="/provider/pro-services" className="rounded-full bg-white/10 px-4 py-2 text-[14px] font-semibold hover:bg-white/20">Pro Services prices</Link>
        </header>
        <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#9CC9F2]">Pro Services demo · {s.name}</p>
        <h1 className="mt-2 max-w-[24ch] font-display text-[32px] leading-[1.1] [text-wrap:balance] sm:text-[44px]">{s.headline}</h1>
        <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-white/75">{s.helps}</p>
        <div className="mt-8"><ProDemo kind={kind} /></div>
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
          <div>
            <h2 className="text-[18px] font-semibold">In this demo</h2>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {DEMO_STORIES[kind].captions.map((c, i) => (
                <li key={c} className="flex gap-3 rounded-[14px] bg-white/5 p-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1666AA] text-[12px] font-bold">{i + 1}</span>{c}</li>
              ))}
            </ol>
            <p className="mt-3 text-[12.5px] text-white/50">Sample data only. Names, addresses and dates are made up.</p>
          </div>
          <div className="rounded-[18px] bg-white/5 p-5">
            <p className="text-[14px] text-white/70">Prices start at</p>
            <p className="font-display text-[30px]">{s.prices[0]?.price ?? "Ask us"}</p>
            <p className="mt-1 text-[13px] text-white/60">Plus VAT. For Professional and Business members.</p>
            <Link href={`/provider/pro-services#${kind.toLowerCase()}`} className="mt-4 block rounded-full bg-[#1666AA] px-5 py-3 text-center font-bold hover:bg-[#0F4F87]">Get the full pack by email</Link>
            <a href={packPdfPath(kind)} target="_blank" rel="noopener" className="mt-2 block rounded-full bg-white/10 px-5 py-3 text-center font-semibold hover:bg-white/20">Download the PDF guide</a>
            <Link href="/join" className="mt-2 block rounded-full bg-white/10 px-5 py-3 text-center font-semibold hover:bg-white/20">New to RoomsNow? Join</Link>
          </div>
        </div>
        <nav aria-label="Other demos" className="mt-10 border-t border-white/10 pt-6">
          <p className="text-[14px] font-semibold text-white/70">More demos</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(DEMO_SLUG) as DemoKind[]).filter((k) => k !== kind).map((k) => (
              <Link key={k} href={`/demos/${DEMO_SLUG[k]}`} className="rounded-full bg-white/10 px-4 py-2 text-[14px] font-semibold hover:bg-white/20">{PRO_SERVICES[k].name}</Link>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}

/** Demo page for a membership plan or paid extra (boosts, sponsored adverts…). */
function PlanDemoPage({ plan, record }: { plan: PlanGuideKey; record: boolean }) {
  if (record) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#171F2E]">
        <style>{`aside[aria-label="Cookie preferences"]{display:none!important}`}</style>
        <div className="w-full max-w-[1920px]"><PlanDemo kind={plan} autoPlay bare /></div>
      </main>
    );
  }
  const g = PLAN_GUIDES[plan];
  return (
    <main className="min-h-dvh bg-[#121a28] px-4 pb-16 text-white">
      <div className="mx-auto max-w-[1080px]">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="text-[20px] font-bold">Rooms<span className="text-[#549DE5]">Now</span></Link>
          <Link href="/pricing" className="rounded-full bg-white/10 px-4 py-2 text-[14px] font-semibold hover:bg-white/20">All prices</Link>
        </header>
        <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#9CC9F2]">{g.group} · {g.name}</p>
        <h1 className="mt-2 max-w-[24ch] font-display text-[32px] leading-[1.1] [text-wrap:balance] sm:text-[44px]">{g.headline}</h1>
        <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-white/75">{g.whoFor}</p>
        <div className="mt-8"><PlanDemo kind={plan} /></div>
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
          <div>
            <h2 className="text-[18px] font-semibold">How to use it</h2>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {g.steps.map((c, i) => (
                <li key={c} className="flex gap-3 rounded-[14px] bg-white/5 p-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1666AA] text-[12px] font-bold">{i + 1}</span>{c}</li>
              ))}
            </ol>
            <p className="mt-3 text-[12.5px] text-white/50">Sample data only. Names, places and figures are made up.</p>
          </div>
          <div className="rounded-[18px] bg-white/5 p-5">
            <Link href={`/pricing#demo-${g.slug}`} className="block rounded-full bg-[#1666AA] px-5 py-3 text-center font-bold hover:bg-[#0F4F87]">See prices</Link>
            <a href={planPdfPath(plan)} target="_blank" rel="noopener" className="mt-2 block rounded-full bg-white/10 px-5 py-3 text-center font-semibold hover:bg-white/20">Download the PDF guide</a>
          </div>
        </div>
        <nav aria-label="Other demos" className="mt-10 border-t border-white/10 pt-6">
          <p className="text-[14px] font-semibold text-white/70">More demos</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PLAN_GUIDE_KEYS.filter((k) => k !== plan).map((k) => (
              <Link key={k} href={`/demos/${PLAN_GUIDES[k].slug}`} className="rounded-full bg-white/10 px-4 py-2 text-[14px] font-semibold hover:bg-white/20">{PLAN_GUIDES[k].name}</Link>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
