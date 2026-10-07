import { HousingCostCalculator } from "@/components/housing-cost-calculator";
import { birminghamRatesCurrent, LHA_SOURCE, UC_LHA_SOURCE } from "@/lib/housing-costs";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: "Housing Benefit & LHA Rent Calculator for Birmingham", description: "Compare private rent with your Local Housing Allowance cap. Understand Universal Credit housing costs, rent shortfalls and supported accommodation benefit routes.", path: "/housing-benefit-calculator" });

export default function HousingBenefitCalculatorPage() {
  return <main className="shell py-10 sm:py-14">
    <span className="eyebrow">Rent and benefits</span>
    <h1 className="mt-3 max-w-[26ch] text-[32px] leading-tight sm:text-[46px]">How much of my rent could benefits cover?</h1>
    <p className="mb-8 mt-4 max-w-[70ch] text-[17px] leading-relaxed text-ink-soft">A private-rental LHA rent-cap calculator for Birmingham and other UK areas. Compare eligible rent with the official rate, then check your full entitlement before agreeing a tenancy.</p>
    <HousingCostCalculator currentRates={birminghamRatesCurrent()} />
    <section className="card mt-6 p-6">
      <h2 className="text-[22px]">Which rules apply?</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">An HMO room is not automatically supported or exempt accommodation. Ask the provider whether care, support or supervision is part of your housing and confirm the benefit route with the council. This tool compares rent and the LHA limit only; it does not decide eligibility.</p>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-[14px] text-pine-dark underline">
        <a href={LHA_SOURCE}>VOA 2026/27 rate publication</a>
        <a href={UC_LHA_SOURCE}>DWP 2026/27 monthly Universal Credit rates</a>
        <a href="https://www.gov.uk/government/statistics/local-housing-allowance-indicative-rates-for-2024-to-2025/indicative-local-housing-allowance-rates-for-2024-to-2025">Birmingham rate table carried forward to 2026/27</a>
        <a href="https://www.gov.uk/housing-and-universal-credit/renting-from-private-landlord">UC private-rental rules and shared-rate exceptions</a>
        <a href="https://www.gov.uk/housing-and-universal-credit">Supported and temporary housing rules</a>
      </div>
      <p className="mt-3 text-[12px] text-ink-faint">Sources checked 7 October 2026. Birmingham examples are valid 1 April 2026–31 March 2027 and are hidden automatically outside that period. Always check your postcode rate.</p>
    </section>
  </main>;
}
