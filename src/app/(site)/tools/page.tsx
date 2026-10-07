import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Housing Tools, Rent Calculator & Area Guides",
  description: "Use RoomsNow's housing tools to compare rent against LHA limits, explore Birmingham neighbourhoods and prepare for viewings and referrals.",
  path: "/tools",
});

const tools = [
  { href: "/housing-benefit-calculator", tag: "Rent planning", symbol: "£", title: "Housing Benefit / LHA calculator", description: "Compare your private rent with the official LHA cap and see the possible rent gap. This is not a full benefit entitlement calculation.", action: "Open calculator" },
  { href: "/eligibility", tag: "Find accommodation", symbol: "✓", title: "Accommodation matching check", description: "Answer a few questions about location, age, support and funding to explore rooms that may suit you. Providers still confirm eligibility and suitability.", action: "Start the check" },
  { href: "/areas/birmingham", tag: "Local knowledge", symbol: "⌂", title: "Birmingham neighbourhood guides", description: "Explore Erdington, Handsworth and Small Heath: transport, GP finders, food support and available rooms in each area.", action: "Explore neighbourhoods" },
  { href: "/guides", tag: "Practical guidance", symbol: "≡", title: "Housing and referral guides", description: "Step-by-step help with finding an HMO room, preparing for a viewing and making a supported accommodation referral. Save guides as PDF for later.", action: "Browse guides" },
  { href: "/support-services", tag: "Help and support", symbol: "♡", title: "Support services directory", description: "Find housing advice, mental-health support, community services and crisis helplines. Check each organisation's eligibility and opening hours.", action: "Find support" },
];

export default function ToolsPage() {
  return (
    <>
      <section className="surface-home border-b border-line">
        <div className="shell py-12 sm:py-16">
          <span className="eyebrow">ROOMSNOW TOOLS</span>
          <h1 className="mt-4 max-w-[20ch] text-[36px] leading-tight sm:text-[48px]">Useful tools for your next move</h1>
          <p className="mt-4 max-w-[65ch] text-[17px] leading-relaxed text-ink-soft">Plan your rent, get to know an area and prepare for accommodation enquiries or referrals. These tools and guides are free to explore, with no account needed.</p>
        </div>
      </section>
      <div className="shell py-10 sm:py-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="card interactive-card group flex flex-col p-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine">
              <span aria-hidden="true" className="mb-5 grid h-12 w-12 place-items-center rounded-[14px] bg-pine-light text-[26px] font-semibold text-pine-dark">{tool.symbol}</span>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-pine-dark">{tool.tag}</p>
              <h2 className="mt-2 text-[23px] leading-tight group-hover:text-pine-dark">{tool.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{tool.description}</p>
              <span className="mt-auto pt-6 text-[14px] font-semibold text-pine-dark">{tool.action} <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
        <aside className="mt-8 rounded-[14px] border border-line bg-paper-sunk p-5 text-[14px] leading-relaxed text-ink-soft">Tools provide guidance, not a housing offer or a benefit decision. Confirm room availability and support arrangements with the provider, and benefit entitlement with the relevant authority. If you are in immediate danger, call 999.</aside>
      </div>
    </>
  );
}
